import type { JSONValue } from "replicache";
import { z } from "zod";
import type { Executor } from "./pg";
import reactIssues from "issues-react.json.gz";
import { ReplicacheTransaction } from "./replicache-transaction";
import { Priority, putIssue, Status } from "frontend/issue";

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

export async function createSchemaVersion1(executor: Executor) {
  await executor("create table meta (key text primary key, value json)");
  await executor("insert into meta (key, value) values ('schemaVersion', '1')");

  await executor(`create table space (
      id text primary key not null,
      version integer not null,
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
      deleted boolean not null,
      version integer not null,
      lastmodified timestamp(6) not null
      )`);

  await executor(`create unique index on entry (spaceid, key)`);
  await executor(`create index on entry (spaceid)`);
  await executor(`create index on entry (deleted)`);
  await executor(`create index on entry (version)`);
}

export async function initSpace(executor: Executor, spaceID: string) {
  const { rows } = await executor(`select version from space where id = $1`, [
    spaceID,
  ]);
  console.log("rows", rows);
  if (rows.length !== 0) {
    console.log("Space already initialized", spaceID);
    return;
  }
  console.log("Initializing space", spaceID);
  const initialVersion = 1;
  await executor(
    `insert into space (id, version, lastmodified) values ($1, $2, now())`,
    [spaceID, initialVersion]
  );
  const tx = new ReplicacheTransaction(
    executor,
    spaceID,
    "fake-client-id-for-server-init",
    initialVersion
  );
  console.log("num issues", reactIssues.length);

  for (let i = 0; i < reactIssues.length; i++) {
    const reactIssue = reactIssues[i];
    const issue = {
      priority: Priority.NONE,
      id: reactIssue.id.toString(),
      // TODO: Remove this title and body truncation when we add incremental
      // client view sync.  Without this the initial pull response
      // exceeds the nextjs max response size.
      title: reactIssue.title.substring(0, 150),
      description: (reactIssue.body || "").substring(0, 150),
      status: reactIssue.state === "open" ? Status.TODO : Status.DONE,
      modified: Date.parse(reactIssue.updated_at),
    };
    await putIssue(tx, issue);
  }
  await tx.flush();
}

export async function getEntry(
  executor: Executor,
  spaceID: string,
  key: string
): Promise<JSONValue | undefined> {
  const {
    rows,
  } = await executor(
    "select value from entry where spaceid = $1 and key = $2 and deleted = false",
    [spaceID, key]
  );
  const value = rows[0]?.value;
  if (value === undefined) {
    return undefined;
  }
  return JSON.parse(value);
}

export async function putEntry(
  executor: Executor,
  spaceID: string,
  key: string,
  value: JSONValue,
  version: number
): Promise<void> {
  await executor(
    `
    insert into entry (spaceid, key, value, deleted, version, lastmodified)
    values ($1, $2, $3, false, $4, now())
      on conflict (spaceid, key) do update set
        value = $3, deleted = false, version = $4, lastmodified = now()
    `,
    [spaceID, key, JSON.stringify(value), version]
  );
}

export async function delEntry(
  executor: Executor,
  spaceID: string,
  key: string,
  version: number
): Promise<void> {
  await executor(
    `update entry set deleted = true, version = $3 where spaceid = $1 and key = $2`,
    [spaceID, key, version]
  );
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

export async function getCookie(
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

export async function setCookie(
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
