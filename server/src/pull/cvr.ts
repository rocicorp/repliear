import type {Comment, Description, Issue} from 'shared';
import type {SearchResult} from '../data.js';
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

export async function findMaxClientViewVersion(
  executor: Executor,
  clientGroupID: string,
) {
  const result = await executor(
    /*sql*/ `SELECT MAX("version") AS max FROM "client_view" WHERE "client_group_id" = $1`,
    [clientGroupID],
  );
  if (result.rowCount === 0) {
    return 0;
  }
  return result.rows[0].max || 0;
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

/**
 * Here we handle when the client sent an old cookie.
 *
 * What we do is to fast-forward them to current time by
 * sending them all the changes that have happened since
 * their cookie.
 *
 * We use the client_view_entry table to do this
 *
 * @param executor
 * @param table
 * @param clientGroupID
 * @param order
 * @param excludeIds - Pulls also gather together all mutations of data that the client already has.
 * We can exclude these rows from the fast-forward since they've already been gathered.
 */
export async function findRowsForFastforward<T extends keyof TableType>(
  executor: Executor,
  table: T,
  clientGroupID: string,
  order: number,
  excludeIds: readonly string[],
): Promise<TableType[T][]> {
  const ret = await executor(
    /*sql*/ `SELECT t.* FROM client_view_entry AS cve
    JOIN "${table}" AS t ON cve.entity_id = t.id WHERE 
      cve.entity = $1 AND
      cve.client_group_id = $2 AND
      cve.client_view_version > $3 ${
        excludeIds.length > 0
          ? `AND t.id NOT IN (${excludeIds
              .map((_, i) => '$' + (i + 4))
              .join(', ')})`
          : ''
      }`,
    [TableOrdinal[table], clientGroupID, order, ...excludeIds],
  );
  return ret.rows;
}

export async function findCreates<T extends keyof TableType>(
  executor: Executor,
  table: T,
  clientGroupID: string,
  cookieClientViewVersion: number,
  limit: number,
): Promise<TableType[T][]> {
  // Find all rows that exist in the base table but not in the CVR table.
  const sql = /*sql*/ `SELECT *
      FROM "${table}" WHERE id NOT IN (
        SELECT cve.entity_id FROM client_view_entry cve WHERE 
        cve.entity = $1 AND
        cve.client_group_id = $2 AND
        cve.client_view_version <= $3
    ) LIMIT $4`;

  const params = [
    TableOrdinal[table],
    clientGroupID,
    cookieClientViewVersion,
    limit,
  ];
  return (await executor(sql, params)).rows;
}

/**
 * Looks for rows that the client has that have been changed on the server.
 *
 * The basic idea here is to:
 * Find all CVE entries that exist and have a different row_version in the base table.
 *
 * We don't want to find missing rows (that is done in findDeletions) so we use a natural join.
 */
export async function findUpdates<T extends keyof TableType>(
  executor: Executor,
  table: T,
  clientGroupID: string,
): Promise<TableType[T][]> {
  // `cve."entity_version" != t."version"` rather than `IS DISTINCT FROM` is intentional here.
  // We do not want to return `updates` for items that were deleted and then re-created
  // FindCreates will do that for us.
  return (
    await executor(
      /*sql*/ `SELECT t.* FROM "client_view_entry" AS cve
      JOIN "${table}" AS t ON cve."entity_id" = t."id" WHERE 
        cve."entity" = $1 AND
        cve."entity_version" != t."version" AND
        cve."client_group_id" = $2`,
      [TableOrdinal[table], clientGroupID],
    )
  ).rows;
}

/**
 * No limit as all modifications to data the client holds need to be returned.
 *
 * This:
 * 1. Scans all CVR entries for the client group (past, present and future wrt order)
 * 2. Sees if rows for those entries no longer exists in the base table
 * 3. Sends these as deletes to the client
 *
 * There is one additional optimization:
 * If we already sent a delete before, we don't send it again.
 * We do this by not pulling CVR entries which are marked as "deleted" and came before the current order.
 *
 * `entity_version IS NULL` is a special case for deletes.
 *
 * @param executor
 * @param table
 * @param clientGroupID
 * @param order
 * @returns
 */
export async function findDeletes(
  executor: Executor,
  table: keyof typeof TableOrdinal,
  clientGroupID: string,
  cookieClientViewVersion: number,
): Promise<string[]> {
  return (
    await executor(
      /*sql*/ `SELECT cve.entity_id as id FROM client_view_entry as cve
    WHERE cve.client_group_id = $1 AND
    ((cve.client_view_version <= $2 AND cve.entity_version IS NOT NULL) OR cve.client_view_version > $2) AND
    cve.entity = $3 EXCEPT SELECT t.id FROM "${table}" as t`,
      [clientGroupID, cookieClientViewVersion, TableOrdinal[table]],
    )
  ).rows.map(r => r.id);
}

export async function recordUpdates(
  executor: Executor,
  table: keyof typeof TableOrdinal,
  clientGroupID: string,
  order: number,
  updates: SearchResult[],
) {
  if (updates.length === 0) {
    return;
  }

  const placeholders = [];
  const values = [];
  const stride = 5;
  for (let i = 0; i < updates.length; i++) {
    placeholders.push(
      `($${i * stride + 1}, $${i * stride + 2}, $${i * stride + 3}, $${
        i * stride + 4
      }, $${i * stride + 5})`,
    );
    values.push(
      clientGroupID,
      order,
      TableOrdinal[table],
      updates[i].id,
      updates[i].version,
    );
  }

  await executor(
    /*sql*/ `INSERT INTO client_view_entry (
    "client_group_id",
    "client_view_version",
    "entity",
    "entity_id",
    "entity_version"
  ) VALUES ${placeholders.join(
    ', ',
  )} ON CONFLICT ("client_group_id", "entity", "entity_id") DO UPDATE SET
    "entity_version" = excluded."entity_version",
    "client_view_version" = excluded."client_view_version"
  `,
    values,
  );
}

/**
 * Records a CVR entry for the deletes.
 *
 * Note: we could update this to cull CRV entries that are no longer needed.
 * We'd have to tag delete entries against the current cvr to do that rather then
 * the next cvr. If a cvr was already previously requested, the next request for the same CVR
 * returns the previously recorded deletes rather than computing deletes.
 * @param executor
 * @param table
 * @param ids
 * @returns
 */
export async function recordDeletes(
  executor: Executor,
  table: keyof typeof TableOrdinal,
  clientGroupID: string,
  order: number,
  ids: string[],
) {
  if (ids.length === 0) {
    return;
  }
  const placeholders = [];
  const values = [];
  const stride = 4;
  for (let i = 0; i < ids.length; i++) {
    placeholders.push(
      `($${i * stride + 1}, $${i * stride + 2}, $${i * stride + 3}, $${
        i * stride + 4
      }, NULL)`,
    );
    values.push(clientGroupID, order, TableOrdinal[table], ids[i]);
  }
  await executor(
    /*sql*/ `INSERT INTO client_view_entry (
    "client_group_id",
    "client_view_version",
    "entity",
    "entity_id",
    "entity_version"
  ) VALUES ${placeholders.join(', ')}`,
    values,
  );
}
