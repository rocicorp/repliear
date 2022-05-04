import type { JSONValue } from "replicache";
import { z } from "zod";
import type { Executor } from "./pg";
import { ReplicacheTransaction } from "./replicache-transaction";
import type { Issue, Comment, Description } from "../frontend/issue";
import { mutators } from "../frontend/mutators";
import { flatten } from "lodash";
import { getSyncOrder } from "./sync-order";

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

export const TEMPLATE_SPACE_ID = "template-space-id";
const INITIAL_SPACE_VERSION = 1;

export async function createSchemaVersion1(executor: Executor) {
  await executor(`create table meta (key text primary key, value json)`);
  await executor(`insert into meta (key, value) values ('schemaVersion', '1')`);

  await executor(`create table space (
      id text primary key not null,
      version integer not null,
      used boolean not null,
      lastmodified timestamp(6) not null
      )`);

  await executor(`alter publication supabase_realtime add table space`);
  await executor(`alter publication supabase_realtime set 
      (publish = 'insert, update, delete');`);

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

  await executor(`create function gen_spaceid() 
      returns text as $$
      declare id text;
      begin
        id := encode(gen_random_bytes(6), 'base64');
        id := replace(id, '/', '_'); -- url safe replacement
        id := replace(id, '+', '-'); -- url safe replacement
        return id;
      end;
      $$ language 'plpgsql';
  `);

  await executor(
    `
    create function init_spaces(count integer)
    returns text[] as $$
    declare spaceids text[] := array[]::text[];
    begin
      for i in 1..count loop
        spaceids[i] := gen_spaceid();
        insert into space (id, version, used, lastmodified) 
          values (spaceids[i], ${INITIAL_SPACE_VERSION}, false, now());
        insert into entry (spaceid, key, value, syncorder, deleted, version, lastmodified)
          select (spaceids[i]), key, value, syncorder, deleted, version, lastmodified 
          from entry where spaceid = '${TEMPLATE_SPACE_ID}';
      end loop;
      return spaceids;
    end;
    $$ language 'plpgsql' volatile;
    `
  );

  await executor(
    `
    create function cleanup_spaces(cleanupLimit integer, max_inactive_hours integer)
    returns text[] as $$
    declare spaceids text[] := array[]::text[];
    begin
      spaceids := array(
        select id from space 
          where used = true and id <> '${TEMPLATE_SPACE_ID}' 
          and lastmodified < now() - interval '1 hour' * max_inactive_hours
          order by lastmodified asc
          limit cleanupLimit
      );
      delete from space where id = any(spaceids);
      delete from entry where spaceid = any(spaceids);
      return spaceids;
    end;
    $$ language 'plpgsql' volatile;
    `
  );
}

export async function getUnusedSpace(
  executor: Executor,
  getSampleData: () => Promise<SampleData>
): Promise<string> {
  let spaceID = await tryGetUnusedSpace(executor);
  if (spaceID) {
    return spaceID;
  }
  await initSpaces(executor, 1, getSampleData);
  spaceID = await tryGetUnusedSpace(executor);
  if (spaceID) {
    return spaceID;
  }
  throw new Error("Could not find or create unused space");
}

async function tryGetUnusedSpace(
  executor: Executor
): Promise<string | undefined> {
  return (
    await executor(
      `
      update space set used = true where 
      id = (select id from space where used = false order by id limit 1) 
      returning id
      `
    )
  ).rows[0]?.id;
}

export async function initSpaces(
  executor: Executor,
  count: number,
  getSampleData: () => Promise<SampleData>
): Promise<void> {
  const {
    rows: sampleSpaceRows,
  } = await executor(`select version from space where id = $1`, [
    TEMPLATE_SPACE_ID,
  ]);

  if (sampleSpaceRows.length === 0) {
    console.log("Initializing template space", TEMPLATE_SPACE_ID);
    await executor(
      `insert into space (id, version, used, lastmodified) values ($1, $2, true, now())`,
      [TEMPLATE_SPACE_ID, INITIAL_SPACE_VERSION]
    );
    const start = Date.now();
    // We have to batch insertions to work around command size limits
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
        TEMPLATE_SPACE_ID,
        "fake-client-id-for-server-init",
        INITIAL_SPACE_VERSION,
        getSyncOrder
      );
      for (const { issue, description, comments } of sampleDataBatch) {
        await mutators.putIssue(tx, { issue, description });
        for (const comment of comments) {
          await mutators.putIssueComment(tx, comment);
        }
      }
      await tx.flush();
    }
    console.log("Creating template space took " + (Date.now() - start) + "ms");
  }
  const start = Date.now();
  console.log("Copying from template space");
  await executor(
    `insert into space (id, version, used, lastmodified) values (gen_spaceid(), $1, false, now())`,
    [INITIAL_SPACE_VERSION]
  );
  //await executor(`select init_spaces($1)`, [count]);
  console.log(
    "Copying from template space took " + (Date.now() - start) + "ms"
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
    select key, value, deleted from entry where spaceid = $2 and key = $3
  ), baseentry as (
    select key, value from entry where spaceid = $1 and key = $3
  )
  select coalesce(overlayentry.key, baseentry.key), coalesce(overlayentry.value, baseentry.value) as value, overlayentry.deleted as deleted
  from overlayentry full outer join baseentry on overlayentry.key = baseentry.key
    `,
    [TEMPLATE_SPACE_ID, spaceID, key]
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
    insert into entry (spaceid, key, value, syncOrder, deleted, version, lastmodified)
    values ${valuesSql}
    on conflict (spaceid, key) do update set
    value = excluded.value, syncorder = excluded.syncorder, deleted = false, version = excluded.version, lastmodified = now()
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
    `update entry set deleted = true, version = $2 where spaceid = $1 and key in(${keyParamsSQL})`,
    [spaceID, version, ...keys]
  );
}

export async function getIssueEntries(
  executor: Executor,
  spaceID: string
): Promise<[key: string, value: JSONValue][]> {
  const { rows } = await executor(
    `
  with overlayentry as (
    select key, value, deleted from entry where spaceid = $2 and key like 'issue/%'
  ), baseentry as (
    select key, value from entry where spaceid = $1 and key like 'issue/%'
  )
  select coalesce(overlayentry.key, baseentry.key) as key, coalesce(overlayentry.value, baseentry.value) as value, overlayentry.deleted as deleted
  from overlayentry full outer join baseentry on overlayentry.key = baseentry.key
    `,
    [TEMPLATE_SPACE_ID, spaceID]
  );
  return rows
    .filter((row) => !row.deleted)
    .map((row) => [row.key, JSON.parse(row.value)]);
}

export async function getNonIssueEntriesInSyncOrder(
  executor: Executor,
  spaceID: string,
  startSyncOrderExclusive: string,
  limit: number
): Promise<{
  entries: [key: string, value: JSONValue][];
  endSyncOrder: string | undefined;
}> {
  const { rows } = await executor(
    `
  with overlayentry as (
    select key, value, syncorder, deleted from entry where spaceid = $2 and key not like 'issue/%' and syncorder > $3 order by syncorder limit $4
  ), baseentry as (
    select key, value, syncorder from entry where spaceid = $1 and key not like 'issue/%' and syncorder > $3 order by syncorder limit $4
  )
  select key, value, syncorder from (
    select coalesce(overlayentry.key, baseentry.key) as key, 
      coalesce(overlayentry.value, baseentry.value) as value,
      coalesce(overlayentry.syncorder, baseentry.syncorder) as syncorder, 
      overlayentry.deleted as deleted
    from overlayentry full outer join baseentry on overlayentry.key = baseentry.key
  ) as merged 
  where deleted = false or deleted is null 
  order by syncorder
  limit $4
    `,
    [TEMPLATE_SPACE_ID, spaceID, startSyncOrderExclusive, limit]
  );
  return {
    entries: rows.map((row) => [row.key, JSON.parse(row.value)]),
    endSyncOrder: rows[rows.length - 1]?.syncorder,
  };
}

export async function getChangedEntries(
  executor: Executor,
  spaceID: string,
  prevVersion: number
): Promise<[key: string, value: JSONValue, deleted: boolean][]> {
  const {
    rows,
  } = await executor(
    `select key, value, deleted from entry where spaceid = $1 and version > $2`,
    [spaceID, prevVersion]
  );
  return rows.map((row) => [row.key, JSON.parse(row.value), row.deleted]);
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
