import type { JSONValue } from "replicache";
import { z } from "zod";
import type { Executor } from "./pg";
import { ReplicacheTransaction } from "./replicache-transaction";
import type { Issue, Comment, Description } from "../frontend/issue";
import { mutators } from "../frontend/mutators";
import { flatten } from "lodash";
import { getSyncOrder } from "./sync-order";
import { nanoid } from "nanoid";

export type SampleData = {
  issue: Issue;
  description: Description;
  comments: Comment[];
}[];

export async function createDatabase(executor: Executor) {
  const schemaVersion = await getSchemaVersion(executor);
  if (schemaVersion < 0 || schemaVersion > 1) {
    throw new Error("Unexpected schema version: " + schemaVersion);
  }
  if (schemaVersion === 0) {
    await createSchemaVersion1(executor);
  }
  console.log("schemaVersion is 1 - nothing to do");
}

async function getSchemaVersion(executor: Executor) {
  const metaExists = await executor(`select exists(
    select from pg_tables where schemaname = 'public' and tablename = 'meta')`);
  if (!metaExists.rows[0].exists) {
    return 0;
  }

  const qr = await executor(
    `select value from meta where key = 'schemaVersion'`
  );
  return qr.rows[0].value;
}

// nanoid's don't include $, so cannot collide with other space ids.
export const BASE_SPACE_ID = "$base-space-id";

export async function createSchemaVersion1(executor: Executor) {
  await executor(`create table meta (key text primary key, value json)`);
  await executor(`insert into meta (key, value) values ('schemaVersion', '1')`);

  await executor(`create table space (
      id text primary key not null,
      version integer not null,
      lastmodified timestamp(6) not null
      )`);

  await executor(`create table client (
      id text primary key not null,
      lastmutationid integer not null,
      lastmodified timestamp(6) not null
      )`);

  await executor(`create table entry (
      spaceid text not null,
      key text not null,
      value text not null,
      syncorder text not null,
      deleted boolean not null,
      version integer not null,
      lastmodified timestamp(6) not null
      )`);

  await executor(
    `create unique index idx_entry_spaceid_key on entry (spaceid, key)`
  );
  await executor(
    `create index idx_entry_spaceid_syncorder on entry (spaceid, syncorder)`
  );
  await executor(`create index 
      on entry (spaceid, deleted)
      include (key, value, deleted)
      where key like 'issue/%'`);
  await executor(`create index on entry (spaceid)`);
  await executor(`create index on entry (deleted)`);
  await executor(`create index on entry (version)`);
}

const INITIAL_SPACE_VERSION = 1;
export async function initSpace(
  executor: Executor,
  getSampleData: () => Promise<SampleData>
): Promise<string> {
  const {
    rows: baseSpaceRows,
  } = await executor(`select version from space where id = $1`, [
    BASE_SPACE_ID,
  ]);

  if (baseSpaceRows.length === 0) {
    console.log("Initializing base space", BASE_SPACE_ID);
    await insertSpace(executor, BASE_SPACE_ID, INITIAL_SPACE_VERSION);
    const start = Date.now();
    // We have to batch insertions to work around postgres command size limits
    const sampleData = await getSampleData();
    const sampleDataBatchs: SampleData[] = [];
    for (let i = 0; i < sampleData.length; i++) {
      if (i % 1000 === 0) {
        sampleDataBatchs.push([]);
      }
      sampleDataBatchs[sampleDataBatchs.length - 1].push(sampleData[i]);
    }
    for (const sampleDataBatch of sampleDataBatchs) {
      const tx = new ReplicacheTransaction(
        executor,
        BASE_SPACE_ID,
        "fake-client-id-for-server-init",
        INITIAL_SPACE_VERSION,
        getSyncOrder
      );
      for (const { issue, description, comments } of sampleDataBatch) {
        await mutators.putIssue(tx, { issue, description });
        for (const comment of comments) {
          await mutators.putIssueComment(tx, comment, false);
        }
      }
      await tx.flush();
    }
    console.log("Initing base space took " + (Date.now() - start) + "ms");
  }
  const spaceID = nanoid(10);
  await insertSpace(executor, spaceID, INITIAL_SPACE_VERSION);
  return spaceID;
}

async function insertSpace(
  executor: Executor,
  spaceID: string,
  version: number
) {
  await executor(
    `insert into space (id, version, lastmodified) values ($1, $2, now())`,
    [spaceID, version]
  );
}

export async function getEntry(
  executor: Executor,
  spaceID: string,
  key: string
): Promise<JSONValue | undefined> {
  const { rows } = await executor(
    `
    with overlayentry as (
      select key, value, deleted from entry where spaceid = $1 and key = $3
    ), baseentry as (
      select key, value from entry where spaceid = $2 and key = $3
    )
    select coalesce(overlayentry.key, baseentry.key), 
      coalesce(overlayentry.value, baseentry.value) as value, 
      overlayentry.deleted as deleted
    from overlayentry full join baseentry on overlayentry.key = baseentry.key
    `,
    [spaceID, BASE_SPACE_ID, key]
  );
  const value = rows[0]?.value;
  if (value === undefined || rows[0]?.deleted) {
    return undefined;
  }
  return JSON.parse(value);
}

export async function putEntries(
  executor: Executor,
  spaceID: string,
  entries: [key: string, value: JSONValue, syncOrder: string][],
  version: number
): Promise<void> {
  if (entries.length === 0) {
    return;
  }
  const valuesSql = Array.from(
    { length: entries.length },
    (_, i) =>
      `($1, $${i * 3 + 3}, $${i * 3 + 4}, $${i * 3 + 5}, false, $2, now())`
  ).join();
  await executor(
    `
    insert into entry (
      spaceid, key, value, syncOrder, deleted, version, lastmodified
    ) values ${valuesSql}
    on conflict (spaceid, key) do 
    update set value = excluded.value, syncorder = excluded.syncorder, 
      deleted = false, version = excluded.version, lastmodified = now()
    `,
    [
      spaceID,
      version,
      ...flatten(
        entries.map(([key, value, syncOrder]) => [
          key,
          JSON.stringify(value),
          syncOrder,
        ])
      ),
    ]
  );
}

export async function delEntries(
  executor: Executor,
  spaceID: string,
  keys: string[],
  version: number
): Promise<void> {
  if (keys.length === 0) {
    return;
  }
  const keyParamsSQL = keys.map((_, i) => `$${i + 3}`).join(",");
  await executor(
    `
    update entry set deleted = true, version = $2 
    where spaceid = $1 and key in(${keyParamsSQL})
    `,
    [spaceID, version, ...keys]
  );
}

export async function getIssueEntries(
  executor: Executor,
  spaceID: string
): Promise<[key: string, value: string][]> {
  const { rows } = await executor(
    `
    with overlayentry as (
      select key, value, deleted from entry 
      where spaceid = $1 and key like 'issue/%'
    ), baseentry as (
      select key, value from entry where spaceid = $2 and key like 'issue/%'
    )
    select coalesce(overlayentry.key, baseentry.key) as key, 
      coalesce(overlayentry.value, baseentry.value) as value, 
      overlayentry.deleted as deleted
    from overlayentry full join baseentry on overlayentry.key = baseentry.key
    `,
    [spaceID, BASE_SPACE_ID]
  );
  const startFilter = Date.now();
  const filtered: [key: string, value: string][] = rows
    .filter((row) => !row.deleted)
    .map((row) => [row.key, row.value]);

  console.log("getIssueEntries filter took " + (Date.now() - startFilter));
  return filtered;
}

export async function getNonIssueEntriesInSyncOrder(
  executor: Executor,
  spaceID: string,
  startSyncOrderExclusive: string,
  limit: number
): Promise<{
  entries: [key: string, value: string][];
  endSyncOrder: string | undefined;
}> {
  // All though it complicates the query, we do the deleted filtering
  // in the query so that we can correctly limit the results.
  const { rows } = await executor(
    `
    with overlayentry as (
      select key, value, syncorder, deleted from entry 
      where spaceid = $1 and key not like 'issue/%' and syncorder > $3 
      order by syncorder limit $4
    ), baseentry as (
      select key, value, syncorder from entry 
      where spaceid = $2 and key not like 'issue/%' and syncorder > $3 
      order by syncorder limit $4
    )
    select key, value, syncorder from (
      select coalesce(overlayentry.key, baseentry.key) as key, 
        coalesce(overlayentry.value, baseentry.value) as value,
        coalesce(overlayentry.syncorder, baseentry.syncorder) as syncorder, 
        overlayentry.deleted as deleted
      from overlayentry full join baseentry on overlayentry.key = baseentry.key
    ) as merged where deleted = false or deleted is null 
    order by syncorder
    limit $4
    `,
    [spaceID, BASE_SPACE_ID, startSyncOrderExclusive, limit]
  );
  return {
    entries: rows.map((row) => [row.key, row.value]),
    endSyncOrder: rows[rows.length - 1]?.syncorder,
  };
}

export async function getChangedEntries(
  executor: Executor,
  spaceID: string,
  prevVersion: number
): Promise<[key: string, value: string, deleted: boolean][]> {
  // changes are only in the onverlay space, so we do not need to
  // query the base space.
  const {
    rows,
  } = await executor(
    `select key, value, deleted from entry where spaceid = $1 and version > $2`,
    [spaceID, prevVersion]
  );
  return rows.map((row) => [row.key, row.value, row.deleted]);
}

export async function getVersion(
  executor: Executor,
  spaceID: string
): Promise<number | undefined> {
  const { rows } = await executor(`select version from space where id = $1`, [
    spaceID,
  ]);
  const value = rows[0]?.version;
  if (value === undefined) {
    return undefined;
  }
  return z.number().parse(value);
}

export async function setVersion(
  executor: Executor,
  spaceID: string,
  version: number
): Promise<void> {
  await executor(
    `update space set version = $2, lastmodified = now() where id = $1`,
    [spaceID, version]
  );
}

export async function getLastMutationID(
  executor: Executor,
  clientID: string
): Promise<number | undefined> {
  const {
    rows,
  } = await executor(`select lastmutationid from client where id = $1`, [
    clientID,
  ]);
  const value = rows[0]?.lastmutationid;
  if (value === undefined) {
    return undefined;
  }
  return z.number().parse(value);
}

export async function setLastMutationID(
  executor: Executor,
  clientID: string,
  lastMutationID: number
): Promise<void> {
  await executor(
    `
    insert into client (id, lastmutationid, lastmodified)
    values ($1, $2, now())
    on conflict (id) do update set lastmutationid = $2, lastmodified = now()
    `,
    [clientID, lastMutationID]
  );
}
