import type {Comment, Description, Issue} from 'shared';
import type {Executor} from '../pg.js';

// This represents the same row as ClientRecord in data.ts, but with the same
// casing as is used in the db rather than camelCase. This is needed because
// this code in pull and cvr.ts assumes they match.
export type Client = {
  id: string;
  lastmutationid: number;
};

// These two consts drive the tables to sync.
// Adding a new const here that is the name of a table will cause
// the table to be synced.
export const TableOrdinal = {
  issue: 1,
  description: 2,
  comment: 3,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  replicache_client: 4,
} as const;
export type TableType = {
  issue: Issue;
  description: Description;
  comment: Comment;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  replicache_client: Client;
};

export type SyncedTables = keyof typeof TableOrdinal;
export const syncedTables = Object.keys(TableOrdinal) as SyncedTables[];
export type Puts = {
  [P in keyof TableType]: TableType[P][];
};
export type Deletes = {
  [P in keyof TableType]: string[];
};

export async function getPutsSince<T extends keyof TableType>(
  executor: Executor,
  table: T,
  clientGroupID: string,
  fromClientViewVersion: number,
): Promise<TableType[T][]> {
  const ret = await executor(
    /*sql*/ `SELECT t.* FROM client_view_entry AS cve
    JOIN "${table}" AS t ON cve.entity_id = t.id WHERE 
      cve.client_group_id = $2 AND
      cve.entity = $1 AND
      cve.deleted = false AND
      cve.client_view_version > $3`,
    [TableOrdinal[table], clientGroupID, fromClientViewVersion],
  );
  return ret.rows;
}

export async function getDelsSince<T extends keyof TableType>(
  executor: Executor,
  table: T,
  clientGroupID: string,
  fromClientViewVersion: number,
): Promise<string[]> {
  const ret = await executor(
    /*sql*/ `SELECT entity_id
    FROM client_view_entry AS cve
    WHERE
      cve.client_group_id = $2 AND
      cve.entity = $1 AND
      cve.deleted = true AND
      cve.client_view_version > $3`,
    [TableOrdinal[table], clientGroupID, fromClientViewVersion],
  );
  return ret.rows.map(r => r.entity_id);
}
