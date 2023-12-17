import type {Comment, Description, Issue} from 'shared';
import type {Executor} from '../pg.js';

export type CVR = {
  clientGroupID: string;
  clientVersion: number;
  order: number;
};

// These two consts drive the tables to sync.
// Adding a new const here that is the name of a table will cause
// the table to be synced.
export const TableOrdinal = {
  issue: 1,
  description: 2,
  comment: 3,
} as const;
export type TableType = {
  issue: Issue & {version: number};
  description: Description & {version: number};
  comment: Comment & {version: number};
};

export type SyncedTables = keyof typeof TableOrdinal;
export const syncedTables = Object.keys(TableOrdinal) as SyncedTables[];
export type Puts = {
  [P in keyof TableType]: TableType[P][];
};
export type Deletes = {
  [P in keyof TableType]: string[];
};

export async function getCVR(
  executor: Executor,
  clientGroupID: string,
  order: number,
): Promise<CVR | undefined> {
  const result = await executor(
    /*sql*/ `SELECT "client_version" FROM "client_view" WHERE "client_group_id" = $1 AND "version" = $2`,
    [clientGroupID, order],
  );
  if (result.rowCount === 0) {
    return undefined;
  }
  return {
    clientGroupID,
    order,
    clientVersion: result.rows[0].client_version,
  };
}

export function putCVR(executor: Executor, cvr: CVR) {
  return executor(
    /*sql*/ `INSERT INTO client_view (
      "client_group_id",
      "client_version",
      "version"
    ) VALUES ($1, $2, $3) ON CONFLICT ("client_group_id", "version") DO UPDATE SET
      client_version = excluded.client_version
    `,
    [cvr.clientGroupID, cvr.clientVersion, cvr.order],
  );
}

export async function recordCreates<T extends keyof TableType>(
  executor: Executor,
  table: T,
  clientGroupID: string,
  clientViewVersion: number,
) {
  console.log('recordCreates', table, clientGroupID, clientViewVersion);
  const sql = `INSERT INTO client_view_entry as cve (
      SELECT
        cast($1 as varchar(36)) as client_group_id,
        $3 as entity,
        t.id as entity_id,
        t.version as entity_version,
        false as deleted,
        $2 as client_view_version
      FROM ${table} AS t
      WHERE t.id NOT IN (
        SELECT cve2.entity_id FROM client_view_entry cve2 WHERE
        cve2.entity = $3 AND
        cve2.client_group_id = $1 AND
        cve2.deleted = false
      )
    )
    ON CONFLICT (entity, entity_id, client_group_id) DO UPDATE SET
      entity_version = EXCLUDED.entity_version,
      deleted = false,
      client_view_version = $2
    `;

  const params = [clientGroupID, clientViewVersion, TableOrdinal[table]];
  await executor(sql, params);
}

export async function recordUpdates<T extends keyof TableType>(
  executor: Executor,
  table: T,
  clientGroupID: string,
  clientViewVersion: number,
) {
  // The conflict on the INSERT will *always* fire. Using this as a hacky way
  // to do a mass-update. Using UPDATE FROM was super slow because it treated
  // the subselect as a nested loop whereas the subquery here is treated as an
  // index scan.
  const sql = `INSERT INTO client_view_entry as cve (
    SELECT
      cve2.client_group_id,
      cve2.entity,
      cve2.entity_id,
      t.version as entity_version,
      cve2.deleted as deleted,
      $3 as client_view_version
    FROM client_view_entry AS cve2
    JOIN ${table} AS t ON cve2.entity_id = t.id
    WHERE 
      cve2.client_group_id = $2 AND
      cve2.entity = $1 AND
      cve2.entity_version != t.version AND
      cve2.deleted = false
  )
  ON CONFLICT (client_group_id, entity, entity_id)
  DO UPDATE SET
    client_view_version = EXCLUDED.client_view_version,
    entity_version = EXCLUDED.entity_version;
`;

  const params = [TableOrdinal[table], clientGroupID, clientViewVersion];
  const ret = await executor(sql, params);
  return ret.rowCount ?? 0;
}

export async function recordDeletes<T extends keyof TableType>(
  executor: Executor,
  table: T,
  clientGroupID: string,
  clientViewVersion: number,
) {
  // The conflict on the INSERT will *always* fire. Using this as a hacky way
  // to do a mass-update. Using UPDATE FROM was super slow because it treated
  // the subselect as a nested loop whereas the subquery here is treated as an
  // index scan.
  const sql = `INSERT INTO client_view_entry as cve (
    SELECT *
    FROM client_view_entry as cve2
    WHERE 
      cve2.client_group_id = $2 AND
      cve2.entity = $1 AND
      cve2.deleted = false AND
      cve2.entity_id NOT IN (
        SELECT id FROM ${table}
      )
    )
  ON CONFLICT (client_group_id, entity, entity_id)
  DO UPDATE SET
    deleted = true,
    client_view_version = $3;`;

  const params = [TableOrdinal[table], clientGroupID, clientViewVersion];
  await executor(sql, params);
}

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
