import {z} from 'zod';
import type {PatchOperation, PullResponse, PullResponseOKV1} from 'replicache';
import {transact, Executor} from '../pg';
import {getClientGroupForUpdate, putClientGroup, searchClients} from '../data';
import type Express from 'express';
import {
  CVR,
  getCVR,
  findMaxClientViewVersion,
  putCVR,
  recordDeletes,
  recordUpdates,
  syncedTables,
  Puts,
  findCreates,
  findRowsForFastforward,
  findDeletes,
  findUpdates,
  Deletes,
} from './cvr';
import {PartialSyncState, PARTIAL_SYNC_STATE_KEY} from 'shared';
import {lock} from '../clientGroupLock';

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

  // Serialize access to the same client group here to prevent
  // postgres from throwing as we serialize access to the same client group
  // there too.
  const ret = await lock.acquire(pull.clientGroupID, async () => {
    return await pullInner(pull);
  });
  const end = performance.now();
  console.log(`Processed pull in ${end - start}ms`);
  return ret;
}

async function pullInner(pull: PullRequest) {
  const {clientGroupID} = pull;

  const {clientChanges, response, prevCVR, nextCVR} = await transact(
    async executor => {
      // Get a write lock on the client group first to serialize with other
      // requests from the CG and avoid deadlocks.
      const baseClientGroupRecord = await getClientGroupForUpdate(
        executor,
        clientGroupID,
      );
      const prevCVR = pull.cookie
        ? await getCVR(executor, pull.cookie.clientGroupID, pull.cookie.order)
        : undefined;
      const baseCVR: CVR = prevCVR ?? {
        clientGroupID,
        clientVersion: 0,
        order: 0,
      };

      const [clientChanges, maxClientViewVersion] = await Promise.all([
        searchClients(executor, {
          clientGroupID,
          sinceClientVersion: baseCVR.clientVersion,
        }),
        findMaxClientViewVersion(executor, clientGroupID),
      ]);
      const isFastForward = baseCVR.order < maxClientViewVersion;

      // For everything the client already has,
      // find all deletes and updates to those items.
      const [deletes, updates] = await Promise.all([
        time(
          () => getAllDeletes(executor, clientGroupID, baseCVR.order),
          'getAllDeletes',
        ),
        time(() => getAllUpdates(executor, clientGroupID), 'getAllUpdates'),
      ]);

      const response = {
        puts: updates,
        deletes,
      };
      // We don't want to include the fast-forward entries in the next CVR.
      const updatesForNextCVR = copyResponse(response);

      // Now find things that the client does not have.
      // Either a fast-forward through CVRs, excluding the updates and deleted we pulled
      // Or newly created items that the client has never seen.
      if (isFastForward) {
        const fastForwardRows = await time(
          () =>
            fastforward(
              executor,
              clientGroupID,
              baseCVR.order,
              deletes,
              updates,
            ),
          'fastforward',
        );
        mergePuts(response.puts, fastForwardRows);
      } else {
        const creates = await time(
          () => getPageOfCreates(executor, clientGroupID, baseCVR.order),
          'getPageOfCreates',
        );
        mergePuts(response.puts, creates);
        mergePuts(updatesForNextCVR.puts, creates);
      }

      // From: https://github.com/rocicorp/todo-row-versioning/blob/d8f351d040db9feae02b4847ea613fbc40aacd17/server/src/pull.ts#L103
      // If there is no clientGroupRecord this means one of two things:
      // 1. The client group is actually new
      // 2. The client group was forked from an existing client group
      //
      // In the latter case the cookie will be filled in. This cookie identifies to us
      // that while the client group is new it actually has data from the client group it was forked from.
      //
      // That data it has is represented by the cvr version taken out of the cookie.
      let prevCVRVersion = baseClientGroupRecord.cvrVersion;
      if (prevCVRVersion === null) {
        if (pull.cookie !== null) {
          prevCVRVersion = pull.cookie.order;
        } else {
          prevCVRVersion = 0;
        }
        console.log(
          `ClientGroup ${clientGroupID} is new, initializing to ${prevCVRVersion}`,
        );
      }

      // If we have no data we do not need to bump `order` as nothing was returned.
      if (isResponseEmpty(response)) {
        return {
          clientChanges,
          response,
          prevCVR,
          nextCVR: {
            clientGroupID,
            clientVersion: baseClientGroupRecord.clientVersion,
            order: prevCVRVersion,
          },
        };
      }

      const nextClientGroupRecord = {
        ...baseClientGroupRecord,
        cvrVersion: prevCVRVersion + 1,
      };

      const nextCVR: CVR = {
        clientGroupID,
        clientVersion: baseClientGroupRecord.clientVersion,
        order: nextClientGroupRecord.cvrVersion,
      };

      await Promise.all([
        putClientGroup(executor, nextClientGroupRecord),
        putCVR(executor, nextCVR),
      ]);

      await syncedTables.map(async t => {
        const puts = updatesForNextCVR.puts[t];
        const deletes = updatesForNextCVR.deletes[t];
        await Promise.all([
          time(
            () =>
              recordUpdates(executor, t, clientGroupID, nextCVR.order, puts),
            'recordUpdates',
          ),
          time(
            () =>
              recordDeletes(executor, t, clientGroupID, nextCVR.order, deletes),
            'recordDeletes',
          ),
        ]);
      });

      return {
        clientChanges,
        response,
        prevCVR,
        nextCVR,
      };
    },
  );

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

  if (prevCVR === undefined) {
    patch.push({op: 'clear'});
  }
  const seen = new Set<string>();
  for (const t of syncedTables) {
    for (const put of response.puts[t]) {
      seen.add(put.id);
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

  // If we have less than page size records
  // then there's nothing left to pull.
  // If we have >= page size records then
  // the client should pull again because there's more to sync
  const complete: PartialSyncState = !hasNextPage(response)
    ? 'COMPLETE'
    : `INCOMPLETE_${nextCVR.order}`;
  patch.push({
    op: 'put',
    key: PARTIAL_SYNC_STATE_KEY,
    value: complete,
  });

  const respCookie: Cookie = {
    clientGroupID,
    order: nextCVR.order,
  };
  const resp: PullResponseOKV1 = {
    cookie: respCookie,
    lastMutationIDChanges: Object.fromEntries(
      clientChanges.map(e => [e.id, e.lastMutationID] as const),
    ),
    patch,
  };
  return resp;
}

export function mergePuts(target: Puts, source: Puts) {
  for (const t of syncedTables) {
    target[t].push(...(source[t] as []));
  }
}

export const LIMIT = 3000;

type PullRecords = {
  puts: Puts;
  deletes: Deletes;
};

export function isResponseEmpty(r: PullRecords) {
  return (
    Object.values(r.puts).every(v => v.length === 0) &&
    Object.values(r.deletes).every(v => v.length === 0)
  );
}

export function hasNextPage(page: PullRecords) {
  return (
    Object.values(page.puts).reduce((acc, v) => acc + v.length, 0) +
      Object.values(page.deletes).reduce((acc, v) => acc + v.length, 0) >=
    LIMIT
  );
}

/**
 * Fast forwards against all tables that are being synced.
 */
export async function fastforward(
  executor: Executor,
  clientGroupID: string,
  cookieClientViewVersion: number,
  deletes: Deletes,
  updates: Puts,
): Promise<Puts> {
  const ret = await Promise.all(
    syncedTables.map(async t =>
      findRowsForFastforward(
        executor,
        t,
        clientGroupID,
        cookieClientViewVersion,
        deletes[t].concat(updates[t].map(i => i.id)),
      ),
    ),
  );

  return Object.fromEntries(ret.map((r, i) => [syncedTables[i], r])) as Puts;
}

export async function getAllDeletes(
  executor: Executor,
  clientGroupID: string,
  cookieClientViewVersion: number,
): Promise<Deletes> {
  const rows = await Promise.all(
    syncedTables.map(async t =>
      findDeletes(executor, t, clientGroupID, cookieClientViewVersion),
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
export async function getAllUpdates(executor: Executor, clientGroupID: string) {
  const ret = await Promise.all(
    syncedTables.map(async t => findUpdates(executor, t, clientGroupID)),
  );

  return Object.fromEntries(ret.map((r, i) => [syncedTables[i], r])) as Puts;
}

/**
 * Returns a page worth of rows that were never sent to the client.
 *
 * @param executor
 * @param clientGroupID
 * @param order
 * @param deletes
 * @param updates
 * @returns
 */
export async function getPageOfCreates(
  executor: Executor,
  clientGroupID: string,
  order: number,
) {
  let remaining = LIMIT;
  const ret: Puts = Object.fromEntries(
    syncedTables.map(t => [t, []]),
  ) as unknown as Puts;
  if (remaining <= 0) {
    return ret;
  }

  // TODO: issue all queries in parallel?
  for (const t of syncedTables) {
    const result = await findCreates<typeof t>(
      executor,
      t,
      clientGroupID,
      order,
      remaining,
    );
    ret[t] = result as unknown as [];
    remaining -= result.length;
    if (remaining <= 0) {
      return ret;
    }
  }

  return ret;
}

async function time<T>(cb: () => Promise<T>, msg: string) {
  const start = performance.now();
  const ret = await cb();
  const end = performance.now();
  console.log(`${msg} took ${end - start}ms`);
  return ret;
}

function copyResponse(response: PullRecords) {
  const puts: Puts = Object.fromEntries(
    syncedTables.map(t => [t, [...response.puts[t]]]),
  ) as unknown as Puts;
  const deletes: Deletes = Object.fromEntries(
    syncedTables.map(t => [t, [...response.deletes[t]]]),
  ) as unknown as Deletes;
  return {puts, deletes};
}
