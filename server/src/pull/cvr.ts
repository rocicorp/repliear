import type {SearchResult} from '../data.js';
import type {Executor} from '../pg.js';

export type CVR = {
  clientGroupID: string;
  clientVersion: number;
  order: number;
};

const VERSION_TREE_SQL = /*sql*/ `WITH RECURSIVE "version_tree" AS (
  SELECT
    "client_group_id",
    "version",
    "parent_version"
  FROM
    "client_view"
  WHERE
    "client_group_id" = $1 AND
    "version" = $2

  UNION ALL

  SELECT
    cv."client_group_id",
    cv."version",
    cv."parent_version"
  FROM
    "client_view" cv
    JOIN "version_tree" vt ON vt."parent_version" = cv."version"
    WHERE cv."client_group_id" = vt."client_group_id"
)`;

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

export function putCVR(executor: Executor, cvr: CVR, parentVersion: number) {
  return executor(
    /*sql*/ `INSERT INTO client_view (
      "client_group_id",
      "client_version",
      "version",
      "parent_version"
    ) VALUES ($1, $2, $3, $4) ON CONFLICT ("client_group_id", "version") DO UPDATE SET
      client_version = excluded.client_version
    `,
    [cvr.clientGroupID, cvr.clientVersion, cvr.order, parentVersion],
  );
}

/**
 * Find all rows in a table that are not in our CVR table.
 *
 * Multiple tabs could be trying to sync at the same time with different CVRs.
 * We path back through our CVR tree to ensure we send the correct data to each tab.
 *
 * We can prune branches of the client view tree that are no longer needed.
 *
 * If we receive a request for a pruned branch we'd track back to find the
 * greatest common ancestor.
 *
 * We could & should also compact:
 * 1. Deletion entries in the client_view_entry table
 * 2. Old entity_versions in the client_view_entry table
 *
 * Compared to the old approach, the client_view_entry table now grows
 * without bound (and requires compaction) since we store a record for each
 * entity_version.
 *
 * We wouldn't have to introduce all of this machinery if
 * tabs coordinated sync.
 */
export function findUnsentItems(
  executor: Executor,
  table: keyof typeof TableOrdinal,
  clientGroupID: string,
  version: number,
  limit: number,
) {
  // The query used below is the fastest.
  // Other query forms that were tried:
  // 1. 10x slower: SELECT * FROM table WHERE NOT EXISTS (SELECT 1 FROM client_view_entry ...)
  // 2. 2x slower: SELECT id, version FROM table EXCEPT SELECT entity_id, entity_version FROM client_view_entry ...
  // 3. SELECT * FROM table LEFT JOIN client_view_entry ...
  const sql = /*sql*/ `
  ${VERSION_TREE_SQL}
  SELECT *
  FROM "${table}" t
  WHERE (t."id", t."version") NOT IN (
    SELECT "entity_id", "entity_version"
    FROM "client_view_entry"
    WHERE "client_view_version" IN (SELECT "version" FROM "version_tree") AND
    "client_group_id" = $1 AND
    "entity" = $3
  )
  LIMIT $4;`;

  const params = [clientGroupID, version, TableOrdinal[table], limit];
  return executor(sql, params);
}

export const TableOrdinal = {
  issue: 1,
  description: 2,
  comment: 3,
} as const;

export function findDeletions(
  executor: Executor,
  table: keyof typeof TableOrdinal,
  clientGroupID: string,
  version: number,
  limit: number,
) {
  const sql = /*sql*/ `${VERSION_TREE_SQL}
  SELECT DISTINCT("entity_id") FROM "client_view_entry" as cve WHERE 
    cve."client_group_id" = $1 AND
    cve."entity" = $3 AND
    cve."client_view_version" IN (SELECT "version" FROM "version_tree") AND
    -- check that the entity is missing from the base table
    NOT EXISTS (
      SELECT 1 FROM "${table}" WHERE id = cve."entity_id"
    ) AND
    -- check that we didn't already record this deletion
    -- and that the row wasn't later resurrected and sent if we did record a deletion
    NOT EXISTS (
      SELECT 1
      FROM client_view_entry as cve2 LEFT JOIN client_view_entry as cve3
        ON (
          cve2.entity_id = cve3.entity_id AND
          cve2.client_view_version < cve3.client_view_version AND
          cve2.client_group_id = cve3.client_group_id AND
          cve2.entity = cve3.entity
        )
      WHERE
        cve3.entity_id IS NULL AND
        cve2.entity_id = cve.entity_id AND
        cve2.entity_version IS NULL AND
        cve2.client_group_id = $1 AND
        cve2.entity = $3 AND
        cve2.client_view_version IN (SELECT "version" FROM "version_tree")
    )
  LIMIT $4`;
  const vars = [clientGroupID, version, TableOrdinal[table], limit];
  return executor(sql, vars);
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
  ) VALUES ${placeholders.join(', ')}`,
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
  const stride = 5;
  for (let i = 0; i < ids.length; i++) {
    placeholders.push(
      `($${i * stride + 1}, $${i * stride + 2}, $${i * stride + 3}, $${
        i * stride + 4
      }, $${i * stride + 5})`,
    );
    values.push(clientGroupID, order, TableOrdinal[table], ids[i], null);
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
