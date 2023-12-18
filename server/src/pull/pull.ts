import {z} from 'zod';
import type {PatchOperation, PullResponse, PullResponseOKV1} from 'replicache';
import {transact, Executor} from '../pg';
import {getClientGroupForUpdate, putClientGroup} from '../data';
import type Express from 'express';
import {syncedTables, Puts, Deletes, getDelsSince, getPutsSince} from './cvr';
import {PARTIAL_SYNC_STATE_KEY} from 'shared';

const cookieSchema = z.object({
  order: z.number(),
  clientGroupID: z.string(),
});

export type Cookie = z.infer<typeof cookieSchema>;

export const pullRequest = z.object({
  clientGroupID: z.string(),
  cookie: z.union([cookieSchema, z.null()]),
});
type PullRequest = z.infer<typeof pullRequest>;

export async function pull(
  requestBody: Express.Request,
): Promise<PullResponse> {
  const start = performance.now();
  console.log(`Processing pull`, JSON.stringify(requestBody, null, ''));
  const pull = pullRequest.parse(requestBody);

  const ret = await pullInner(pull);

  const end = performance.now();
  console.log(`Processed pull in ${end - start}ms`);
  return ret;
}

async function pullInner(pull: PullRequest) {
  const {clientGroupID} = pull;

  const {nextClientGroupRecord, response} = await transact(async executor => {
    // Get a write lock on the client group first to serialize with other
    // requests from the CG and avoid deadlocks.
    const baseClientGroupRecord = await getClientGroupForUpdate(
      executor,
      clientGroupID,
    );

    // From: https://github.com/rocicorp/todo-row-versioning/blob/d8f351d040db9feae02b4847ea613fbc40aacd17/server/src/pull.ts#L103
    // If there is no clientGroupRecord this means one of two things:
    // 1. The client group is actually new
    // 2. The client group was forked from an existing client group
    //
    // In the latter case the cookie will be filled in. This cookie identifies to us
    // that while the client group is new it actually has data from the client group it was forked from.
    //
    // That data it has is represented by the cvr version taken out of the cookie.
    const prevCVRVersion =
      baseClientGroupRecord.cvrVersion ?? pull.cookie?.order ?? 0;
    console.log(
      `ClientGroup ${clientGroupID} is new, initializing to ${prevCVRVersion}`,
    );

    const nextClientGroupRecord = {
      ...baseClientGroupRecord,
      cvrVersion: prevCVRVersion + 1,
    };

    await updateClientView(
      executor,
      clientGroupID,
      nextClientGroupRecord.cvrVersion,
    );

    // For everything the client already has,
    // find all deletes and updates to those items.
    const [puts, deletes] = await Promise.all([
      time(
        () => getAllPuts(executor, clientGroupID, prevCVRVersion),
        'getAllPuts',
      ),
      time(
        () => getAllDels(executor, clientGroupID, prevCVRVersion),
        'getAllDeletes',
      ),
    ]);

    console.log('puts', [...Object.values(puts)].length);

    const response = {
      puts,
      deletes,
    };

    // TODO: Consider optimizing the case where there are no changes.

    await putClientGroup(executor, nextClientGroupRecord);

    return {nextClientGroupRecord, response};
  });

  const patch: PatchOperation[] = [];

  for (const t of syncedTables) {
    console.log(`${t} puts: ${response.puts[t].length}`);
    console.log(`${t} deletes: ${response.deletes[t].length}`);

    console.log(
      `${t} lastid: ${
        response.puts[t][response.puts[t].length - 1]?.id || 'n/a'
      }`,
    );
  }

  for (const t of syncedTables) {
    if (t === 'replicache_client') {
      // Handled specially below.
      continue;
    }
    for (const put of response.puts[t]) {
      // Postgres rightly returns bigint as string given 64 bit ints are > js ints.
      // JS ints are 53 bits so we can safely convert to number for dates here.
      if ('created' in put) {
        put.created = parseInt(put.created as unknown as string);
      }
      if ('modified' in put) {
        put.modified = parseInt(put.modified as unknown as string);
      }
      // annoying postgres column case insensitivity
      if ('kanbanorder' in put) {
        const casted = put as unknown as {
          kanbanOrder?: string;
          kanbanorder?: string;
        };
        casted.kanbanOrder = casted.kanbanorder;
        delete casted.kanbanorder;
      }
      if ('issueid' in put) {
        const casted = put as unknown as {
          issueID?: string;
          issueid?: string;
        };
        casted.issueID = casted.issueid;
        delete casted.issueid;
      }
      patch.push({op: 'put', key: `${t}/${put.id}`, value: put});
    }
    for (const id of response.deletes[t]) {
      patch.push({op: 'del', key: `${t}/${id}`});
    }
  }

  console.log('all puts', JSON.stringify(response.puts, null, '  '));

  // TODO: Reimplement partial sync.
  patch.push({
    op: 'put',
    key: PARTIAL_SYNC_STATE_KEY,
    value: 'COMPLETE',
  });

  const respCookie: Cookie = {
    clientGroupID,
    order: nextClientGroupRecord.cvrVersion,
  };
  const resp: PullResponseOKV1 = {
    cookie: respCookie,
    lastMutationIDChanges: Object.fromEntries(
      response.puts['replicache_client'].map(
        ({id, lastmutationid}) => [id, lastmutationid] as const,
      ),
    ),
    patch,
  };
  return resp;
}

async function updateClientView(
  executor: Executor,
  clientGroupID: string,
  nextClientViewVersion: number,
) {
  // TODO: Attempt parallelizing. Not sure if Postgres will be smart enough
  // with locking since they are all writing to (different records) of the
  // same table.
  await executor(/*sql*/ `select update_client_view(1, 'pull_issue', $1, $2)`, [
    clientGroupID,
    nextClientViewVersion,
  ]);
  await executor(
    /*sql*/ `select update_client_view(2, 'pull_description', $1, $2)`,
    [clientGroupID, nextClientViewVersion],
  );
  await executor(
    /*sql*/ `select update_client_view(3, 'pull_comment', $1, $2)`,
    [clientGroupID, nextClientViewVersion],
  );
  await executor(
    /*sql*/ `select update_client_view(4, 'pull_client', $1, $2)`,
    [clientGroupID, nextClientViewVersion],
  );
}

export async function getAllDels(
  executor: Executor,
  clientGroupID: string,
  fromClientViewVersion: number,
): Promise<Deletes> {
  const rows = await Promise.all(
    syncedTables.map(async t =>
      getDelsSince(executor, t, clientGroupID, fromClientViewVersion),
    ),
  );

  const ret = Object.fromEntries(
    rows.map((r, i) => [syncedTables[i], r]),
  ) as Deletes;
  return ret;
}

/**
 * Returns rows that the client has and have been modified on the server.
 *
 * We fetch these without limit so that the client always receives a total
 * mutation and never a partial mutation result.
 *
 * @param executor
 * @param clientGroupID
 * @returns
 */
export async function getAllPuts(
  executor: Executor,
  clientGroupID: string,
  fromClientViewVersion: number,
) {
  const ret = await Promise.all(
    syncedTables.map(async t =>
      getPutsSince(executor, t, clientGroupID, fromClientViewVersion),
    ),
  );

  return Object.fromEntries(ret.map((r, i) => [syncedTables[i], r])) as Puts;
}

async function time<T>(cb: () => Promise<T>, msg: string) {
  const start = performance.now();
  const ret = await cb();
  const end = performance.now();
  console.log(`${msg} took ${end - start}ms`);
  return ret;
}
