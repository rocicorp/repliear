import type {PGConfig} from './pgconfig/pgconfig.js';
import type {Executor} from './pg.js';

export async function createDatabase(executor: Executor, dbConfig: PGConfig) {
  console.log('creating database');
  const schemaVersion = await dbConfig.getSchemaVersion(executor);
  if (schemaVersion < 0 || schemaVersion > 1) {
    throw new Error('Unexpected schema version: ' + schemaVersion);
  }
  if (schemaVersion === 0) {
    await createSchemaVersion1(executor);
  }
}

export async function createSchemaVersion1(executor: Executor) {
  await executor(
    'CREATE TABLE replicache_meta (key text PRIMARY KEY, value json)',
  );
  await executor(
    "insert into replicache_meta (key, value) values ('schemaversion', '1')",
  );

  // cvrversion is null until first pull initializes it.
  await executor(/*sql*/ `CREATE TABLE replicache_client_group (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    cvrversion INTEGER null,
    clientversion INTEGER NOT NULL,
    lastmodified TIMESTAMP(6) NOT NULL
    )`);

  await executor(/*sql*/ `CREATE TABLE replicache_client (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    clientgroupid VARCHAR(36) NOT NULL,
    lastmutationid INTEGER NOT NULL,
    clientversion INTEGER NOT NULL,
    lastmodified TIMESTAMP(6) NOT NULL
    )`);

  await executor(
    /*sql*/ `CREATE TYPE priority AS ENUM ('NONE', 'LOW', 'MEDIUM', 'HIGH', 'URGENT')`,
  );
  await executor(
    /*sql*/ `CREATE TYPE status AS ENUM ('BACKLOG', 'TODO', 'IN_PROGRESS', 'DONE', 'CANCELED')`,
  );

  await executor(/*sql*/ `CREATE TABLE "issue" (
    "id" VARCHAR(36) PRIMARY KEY NOT NULL,
    "title" text NOT NULL,
    "priority" priority,
    "status" status,
    "modified" BIGINT NOT NULL,
    "created" BIGINT NOT NULL,
    "creator" VARCHAR(36) NOT NULL,
    "kanbanorder" VARCHAR(36),
    "version" INTEGER NOT NULL
  )`);

  await executor(/*sql*/ `CREATE TABLE "comment" (
    "id" VARCHAR(36) PRIMARY KEY NOT NULL,
    "issueid" VARCHAR(36) NOT NULL REFERENCES issue("id") ON DELETE CASCADE,
    "created" BIGINT NOT NULL,
    "body" text NOT NULL,
    "creator" VARCHAR(36) NOT NULL,
    "version" INTEGER NOT NULL
  )`);

  await executor(/*sql*/ `CREATE TABLE "description" (
    "id" VARCHAR(36) PRIMARY KEY NOT NULL REFERENCES issue("id") ON DELETE CASCADE,
    "body" text NOT NULL,
    "version" INTEGER NOT NULL
  )`);

  await executor(/*sql*/ `CREATE TABLE "client_view" (
    "client_group_id" VARCHAR(36) NOT NULL,
    "version" INTEGER NOT NULL,
    "client_version" INTEGER NOT NULL,
    PRIMARY KEY ("client_group_id", "version")
  )`);

  await executor(/*sql*/ `CREATE TABLE "client_view_entry" (
    "client_group_id" VARCHAR(36) NOT NULL,
    "client_view_version" INTEGER NOT NULL,
    "tbl" INTEGER NOT NULL,
    "row_id" VARCHAR(36) NOT NULL,
    "row_version" INTEGER NOT NULL,
    -- unique by client_group_id, tbl, row_id
    -- 1. A missing row version is semantically the same as a behind row version
    -- 2. Our CVR is recursive. CVR_n = CVR_n-1 + (changes since CVR_n-1)
    PRIMARY KEY ("client_group_id", "tbl", "row_id")
  )`);

  await executor(/*sql*/ `CREATE TABLE "client_view_delete_entry" (
    "client_group_id" VARCHAR(36) NOT NULL,
    "client_view_version" INTEGER NOT NULL,
    "tbl" INTEGER NOT NULL,
    "row_id" VARCHAR(36) NOT NULL,
    PRIMARY KEY ("client_group_id", "client_view_version", "tbl", "row_id")
  )`);
}
