import {z} from 'zod';
import type {PatchOperation, PullResponse, PullResponseOKV1} from 'replicache';
import {transact} from '../pg';
import {getClientGroupForUpdate, putClientGroup, searchClients} from '../data';
import type Express from 'express';
import {hasNextPage, isPageEmpty, readNextPage} from './next-page';
import {
  CVR,
  dropCVREntries,
  getCVR,
  putCVR,
  recordDeletes,
  recordUpdates,
} from './cvr';
import {PartialSyncState, PARTIAL_SYNC_STATE_KEY} from 'shared';

const cookieSchema = z.object({
  order: z.number(),
  clientGroupID: z.string(),
});

export type Cookie = z.infer<typeof cookieSchema>;

export const pullRequest = z.object({
  clientGroupID: z.string(),
  cookie: z.union([cookieSchema, z.null()]),
});

export async function pull(
  requestBody: Express.Request,
): Promise<PullResponse> {
  const start = performance.now();
  console.log(`Processing pull`, JSON.stringify(requestBody, null, ''));
  const pull = pullRequest.parse(requestBody);
  const {clientGroupID} = pull;

  const {clientChanges, nextPage, prevCVR, nextCVR} = await transact(
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

      // Drop any cvr entries greater than the order we received.
      // Getting an old order from the client means that the client is possibly missing the data
      // from future orders.
      //
      // The other possbility is that multiple tabs are syncing (why are tabs not coordinating who does sync?)
      // Given that, dropping entries can cause to tabs could starve one another!! I've updated the frontend
      // so pulls can only be issued from one tab (see `useExclusiveEffect`). The other solution here is to not
      // drop CVR entries and instead have CVRs refer to their parent and construct
      // the full CVR state via recursive query.
      //
      // Why do we delete later CVRs?
      // Since we are sharing CVR data across orders (CVR_n = CVR_n-1 + current_pull).
      // To keep greater CVRs around, which may have never been received, means that the next CVR would
      // indicate that the data was received when it was not.
      await dropCVREntries(executor, clientGroupID, baseCVR.order);

      const [clientChanges, nextPage] = await Promise.all([
        searchClients(executor, {
          clientGroupID,
          sinceClientVersion: baseCVR.clientVersion,
        }),
        readNextPage(executor, clientGroupID, baseCVR.order),
      ]);

      console.log(
        `Pull received: ${nextPage.issues.length} issues,
        ${nextPage.descriptions.length} descriptions,
        ${nextPage.comments.length} comments.
        ${nextPage.issueDeletes.length} issue deletes,
        ${nextPage.descriptionDeletes.length} description deletes,
        ${nextPage.commentDeletes.length} comment deletes.`,
      );
      console.log(
        `Start ids for each: 
        issues: ${nextPage.issues[0]?.id}
        descriptions: ${nextPage.descriptions[0]?.id}
        comments: ${nextPage.comments[0]?.id}`,
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
      if (isPageEmpty(nextPage)) {
        return {
          clientChanges,
          nextPage,
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

      await Promise.all([
        recordUpdates(
          executor,
          'issue',
          clientGroupID,
          nextCVR.order,
          nextPage.issueMeta,
        ),
        recordUpdates(
          executor,
          'description',
          clientGroupID,
          nextCVR.order,
          nextPage.descriptionMeta,
        ),
        recordUpdates(
          executor,
          'comment',
          clientGroupID,
          nextCVR.order,
          nextPage.commentMeta,
        ),
        recordDeletes(
          executor,
          'issue',
          clientGroupID,
          nextCVR.order,
          nextPage.issueDeletes,
        ),
        recordDeletes(
          executor,
          'description',
          clientGroupID,
          nextCVR.order,
          nextPage.descriptionDeletes,
        ),
        recordDeletes(
          executor,
          'comment',
          clientGroupID,
          nextCVR.order,
          nextPage.commentDeletes,
        ),
      ]);

      return {
        clientChanges,
        nextPage,
        prevCVR,
        nextCVR,
      };
    },
  );

  const patch: PatchOperation[] = [];

  if (prevCVR === undefined) {
    patch.push({op: 'clear'});
  }
  for (const issue of nextPage.issues) {
    patch.push({op: 'put', key: `issue/${issue.id}`, value: issue});
  }
  for (const description of nextPage.descriptions) {
    patch.push({
      op: 'put',
      key: `description/${description.id}`,
      value: description,
    });
  }
  for (const comment of nextPage.comments) {
    patch.push({
      op: 'put',
      key: `comment/${comment.id}`,
      value: comment,
    });
  }

  for (const id of nextPage.issueDeletes) {
    patch.push({op: 'del', key: `issue/${id}`});
  }
  for (const id of nextPage.descriptionDeletes) {
    patch.push({op: 'del', key: `description/${id}`});
  }
  for (const id of nextPage.commentDeletes) {
    patch.push({op: 'del', key: `comment/${id}`});
  }

  // If we have less than page size records
  // then there's nothing left to pull.
  // If we have >= page size records then
  // the client should pull again because there's more to sync
  const complete: PartialSyncState = !hasNextPage(nextPage)
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
  const end = performance.now();
  console.log(`Processed pull in ${end - start}ms`);
  return resp;
}
