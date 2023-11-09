import {Comment, Description, Issue, issueKeysToColumns} from 'shared';
import type {Executor} from './pg.js';
import type {TableOrdinal} from './pull/cvr.js';

export type SearchResult = {
  id: string;
  rowversion: number;
};

export type ClientGroupRecord = {
  id: string;
  cvrVersion: number | null;
  clientVersion: number;
};

export type ClientRecord = {
  id: string;
  clientGroupID: string;
  lastMutationID: number;
  clientVersion: number;
};

export type Affected = {
  issueIDs: string[];
  descriptionIDs: string[];
  commentIDs: string[];
};

export async function putIssue(
  executor: Executor,
  issue: Issue,
): Promise<Affected> {
  await executor(
    /*sql*/ `INSERT INTO issue (
      id,
      title,
      priority,
      status,
      modified,
      created,
      creator,
      kanbanorder,
      rowversion
    ) VALUES (
      $1,
      $2,
      $3,
      $4,
      EXTRACT(EPOCH FROM NOW()) * 1000,
      EXTRACT(EPOCH FROM NOW()) * 1000,
      $5,
      $6,
      1
    ) ON CONFLICT (id) DO UPDATE SET
      title = $2,
      priority = $3,
      status = $4,
      modified = EXTRACT(EPOCH FROM NOW()) * 1000,
      creator = $5,
      kanbanorder = $6,
      rowversion = issue.rowversion + 1`,
    [
      issue.id,
      issue.title,
      issue.priority,
      issue.status,
      issue.creator,
      issue.kanbanOrder,
    ],
  );
  return {
    issueIDs: [issue.id],
    descriptionIDs: [],
    commentIDs: [],
  };
}

export async function updateIssue(
  executor: Executor,
  id: string,
  issue: Partial<Issue>,
): Promise<Affected> {
  const {sql, values} = updateFromObject(
    id,
    issue,
    'issue',
    issueKeysToColumns,
  );
  await executor(sql, values);
  return {
    issueIDs: [id],
    descriptionIDs: [],
    commentIDs: [],
  };
}

export async function updateDescription(
  executor: Executor,
  id: string,
  description: string,
): Promise<Affected> {
  await executor(
    /*sql*/ `UPDATE description SET body = $1, rowversion = rowversion + 1 WHERE id = $2`,
    [description, id],
  );
  return {
    issueIDs: [id],
    descriptionIDs: [id],
    commentIDs: [],
  };
}

type ReKey<T> = {[K in keyof T]: string};
function updateFromObject<T extends object>(
  id: string,
  o: T,
  table: keyof typeof TableOrdinal,
  rekey: ReKey<T>,
) {
  o = {...o};
  if ('id' in o) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (o as any).id;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (o as any).modified;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (o as any).created;
  }
  const keys = Object.keys(o) as (keyof T)[];
  const values = Object.values(o);
  const placeholders = Array.from({length: keys.length}, (_, i) => {
    // map to our static and controlled set of keys rahter than taking arbitrary user input
    const key = rekey[keys[i]];
    if (key === undefined) throw new Error(`Unknown key ${String(keys[i])}`);
    return `"${key}" = $${i + 2}`;
  }).join(', ');
  return {
    sql: /*sql*/ `UPDATE "${table}" SET ${placeholders}, modified = EXTRACT(EPOCH FROM NOW()) * 1000, rowversion = rowversion + 1 WHERE id = $1`,
    values: [id, ...values],
  };
}

export async function deleteIssue(
  executor: Executor,
  issueID: string,
): Promise<Affected> {
  await executor(`DELETE FROM issue WHERE id = $1`, [issueID]);
  return {
    issueIDs: [issueID],
    descriptionIDs: [],
    commentIDs: [],
  };
}

export async function putDescription(
  executor: Executor,
  description: Description,
): Promise<Affected> {
  await executor(
    /*sql*/ `INSERT INTO description (
      id,
      body,
      rowversion
    ) VALUES (
      $1,
      $2,
      1
    ) ON CONFLICT (id) DO UPDATE SET
      body = $2,
      rowversion = description.rowversion + 1`,
    [description.id, description.body],
  );
  return {
    issueIDs: [],
    descriptionIDs: [description.id],
    commentIDs: [],
  };
}

export async function createComment(
  executor: Executor,
  comment: Comment,
): Promise<Affected> {
  await executor(
    /*sql*/ `INSERT INTO comment (
      id,
      issueid,
      created,
      body,
      creator,
      rowversion
    ) VALUES (
      $1,
      $2,
      EXTRACT(EPOCH FROM NOW()) * 1000,
      $3,
      $4,
      1
    )`,
    [comment.id, comment.issueID, comment.body, comment.creator],
  );
  return {
    issueIDs: [comment.issueID],
    descriptionIDs: [],
    commentIDs: [comment.id],
  };
}

export async function deleteComment(
  executor: Executor,
  commentId: string,
): Promise<Affected> {
  await executor(/*sql*/ `DELETE FROM comment WHERE id = $1`, [commentId]);
  return {
    issueIDs: [],
    descriptionIDs: [],
    commentIDs: [commentId],
  };
}

export async function putClientGroup(
  executor: Executor,
  clientGroup: ClientGroupRecord,
) {
  const {id, cvrVersion, clientVersion} = clientGroup;
  await executor(
    /*sql*/ `insert into replicache_client_group
      (id, cvrversion, clientversion, lastmodified)
    values
      ($1, $2, $3, now())
    on conflict (id) do update set
      cvrversion = $2, clientversion = $3, lastmodified = now()`,
    [id, cvrVersion, clientVersion],
  );
}

export async function getClientGroupForUpdate(
  executor: Executor,
  clientGroupID: string,
) {
  const prevClientGroup = await getClientGroup(executor, clientGroupID, {
    forUpdate: true,
  });
  return (
    prevClientGroup ?? {
      id: clientGroupID,
      cvrVersion: null,
      clientVersion: 0,
    }
  );
}

export async function getClientGroup(
  executor: Executor,
  clientGroupID: string,
  {forUpdate}: {forUpdate?: boolean} = {},
) {
  const {rows} = await executor(
    /*sql*/ `select cvrversion, clientversion from replicache_client_group where id = $1 ${
      forUpdate ? 'for update' : ''
    }`,
    [clientGroupID],
  );
  if (!rows || rows.length === 0) return undefined;
  const r = rows[0];
  const res: ClientGroupRecord = {
    id: clientGroupID,
    cvrVersion: r.cvrversion,
    clientVersion: r.clientversion,
  };
  return res;
}

export async function searchClients(
  executor: Executor,
  {
    clientGroupID,
    sinceClientVersion,
  }: {clientGroupID: string; sinceClientVersion: number},
) {
  const {rows} = await executor(
    /*sql*/ `select id, lastmutationid, clientversion from replicache_client where clientGroupID = $1 and clientversion > $2`,
    [clientGroupID, sinceClientVersion],
  );
  return rows.map(r => {
    const client: ClientRecord = {
      id: r.id,
      clientGroupID,
      lastMutationID: r.lastmutationid,
      clientVersion: r.clientversion,
    };
    return client;
  });
}

export async function getClientForUpdate(executor: Executor, clientID: string) {
  const prevClient = await getClient(executor, clientID, {forUpdate: true});
  return (
    prevClient ?? {
      id: clientID,
      clientGroupID: '',
      lastMutationID: 0,
      clientVersion: 0,
    }
  );
}

export async function getClient(
  executor: Executor,
  clientID: string,
  {forUpdate}: {forUpdate?: boolean} = {},
) {
  const {rows} = await executor(
    /*sql*/ `select clientgroupid, lastmutationid, clientversion from replicache_client where id = $1 ${
      forUpdate ? 'for update' : ''
    }`,
    [clientID],
  );
  if (!rows || rows.length === 0) return undefined;
  const r = rows[0];
  const res: ClientRecord = {
    id: r.id,
    clientGroupID: r.clientgroupid,
    lastMutationID: r.lastmutationid,
    clientVersion: r.lastclientversion,
  };
  return res;
}

export async function putClient(executor: Executor, client: ClientRecord) {
  const {id, clientGroupID, lastMutationID, clientVersion} = client;
  await executor(
    /*sql*/ `
      insert into replicache_client
        (id, clientgroupid, lastmutationid, clientversion, lastmodified)
      values
        ($1, $2, $3, $4, now())
      on conflict (id) do update set
        lastmutationid = $3, clientversion = $4, lastmodified = now()
      `,
    [id, clientGroupID, lastMutationID, clientVersion],
  );
}

export async function getAccessors(executor: Executor, listID: string) {
  const {rows} = await executor(
    /*sql*/ `select ownerid as userid from list where id = $1 union  select userid from share where listid = $1`,
    [listID],
  );
  return rows.map(r => r.userid) as string[];
}

export function getPlaceholders(count: number) {
  return Array.from({length: count}, (_, i) => `$${i + 1}`).join(', ');
}
