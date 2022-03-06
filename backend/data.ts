import { JSONValue } from "replicache";
import { z } from "zod";
import { Executor, transact } from "./pg";

export async function createDatabase() {
  await transact(async (executor) => {
    // TODO: Proper versioning for schema.
    await executor("drop table if exists entry cascade");
    await executor("drop table if exists client cascade");
    await executor("drop table if exists space cascade");

    await executor(`create table client (
      id text primary key not null,
      lastmutationid bigint not null,
      lastmodified timestamp(6) not null
      )`);

    await executor(`create table space (
      id bigserial primary key not null,
      version bigint not null,
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
  });
}

export async function getEntry(
  executor: Executor,
  spaceid: string,
  key: string
): Promise<JSONValue | undefined> {
  const {
    rows,
  } = await executor(
    "select value from entry where spaceid = $1 and key = $2 and deleted = false",
    [spaceid, key]
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
  key: string,
  prevVersion: number
): Promise<[key: string, value: JSONValue, deleted: boolean][]> {
  const {
    rows,
  } = await executor(
    `select key, value from entry where spaceid = $1 and key = $2 and version > $3`,
    [spaceID, key, prevVersion]
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
  const value = rows[0]?.value;
  if (value === undefined) {
    return undefined;
  }
  return z.number().parse(value);
}

export async function setCookie(
  executor: Executor,
  spaceID: bigint,
  cookie: number
): Promise<void> {
  await executor(
    `
    insert into space (cookie, lastmodified) values ($1, now())
      on conflict (id) do update set cookie = $1, lastmodified = now()
    `,
    [cookie]
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
  const value = rows[0]?.value;
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
