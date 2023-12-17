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
    -- ID of the Client Group (provided by Replicache)
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    -- Last CVR version generated for this Client Group
    -- TODO(aa): Need to standardize on either "cvr" or "cv".
    -- Both are used in this codebase.
    cvrversion INTEGER null,
    -- Last client version used by this Client Group
    clientversion INTEGER NOT NULL,
    lastmodified TIMESTAMP(6) NOT NULL
    )`);

  await executor(/*sql*/ `CREATE TABLE replicache_client (
    -- ID of the Client (provided by Replicache)
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    -- ID of the Client Group this Client belongs to
    clientgroupid VARCHAR(36) NOT NULL,
    -- Last mutation processed from this client.
    lastmutationid INTEGER NOT NULL,
    -- Value of replicache_client_group.clientversion last time this client's last_mutation_id changed.
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
    -- Client Group this Client View was generated for
    "client_group_id" VARCHAR(36) NOT NULL,
    -- Version of this Client View
    -- Note that CV's are recursive: CV_n = CV_n-1 + (changes since CV_n-1)
    "version" INTEGER NOT NULL,
    "client_version" INTEGER NOT NULL,
    PRIMARY KEY ("client_group_id", "version")
  )`);

  await executor(/*sql*/ `CREATE TABLE "client_view_entry" (
    -- Client Group the CV was generated for.
    "client_group_id" VARCHAR(36) NOT NULL,
    -- Client View Version the entry was last updated at.
    "client_view_version" INTEGER NOT NULL,
    -- Entity the entry is for.
    "entity" INTEGER NOT NULL,
    -- Entity ID the entry is for.
    "entity_id" VARCHAR(36) NOT NULL,
    -- Version the entity was at when the entry was last updated.
    -- TODO(aa): Use a deleted column.
    "entity_version" INTEGER,
    -- unique by client_group_id, entity, entity_id
    PRIMARY KEY ("client_group_id", "entity", "entity_id")
  )`);

  // TODO (mlaw): see if we can remove this.
  await executor(/*sql*/ `CREATE UNIQUE INDEX "client_view_entry_covering" ON "client_view_entry" (
    "client_group_id", "client_view_version", "entity", "entity_id", "entity_version"
  )`);
}
