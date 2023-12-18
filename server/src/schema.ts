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
    lastmodified TIMESTAMP(6) NOT NULL
    )`);

  await executor(/*sql*/ `CREATE TABLE replicache_client (
    -- ID of the Client (provided by Replicache)
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    -- ID of the Client Group this Client belongs to
    clientgroupid VARCHAR(36) NOT NULL,
    -- Last mutation processed from this client.
    lastmutationid INTEGER NOT NULL,
    lastmodified TIMESTAMP(6) NOT NULL
    )`);

  await executor(/*sql*/ `CREATE TABLE "client_view_entry" (
      -- Client Group the CV was generated for.
      "client_group_id" VARCHAR(36) NOT NULL,
      -- Entity the entry is for.
      "entity" INTEGER NOT NULL,
      -- Entity ID the entry is for.
      "entity_id" VARCHAR(36) NOT NULL,
      -- Version the entity was at when the entry was last updated.
      "entity_version" INTEGER NOT NULL,
      -- Whether the entry has been deleted.
      "deleted" BOOLEAN NOT NULL DEFAULT FALSE,
      -- Client View Version the entry was last updated at.
      "client_view_version" INTEGER NOT NULL,
      -- unique by client_group_id, entity, entity_id
      PRIMARY KEY ("client_group_id", "entity", "entity_id")
    )`);

  await executor(/*sql*/ `CREATE TYPE entity_version AS (
    id VARCHAR,
    version INTEGER
  )`);

  await executor(/*sql*/ `CREATE OR REPLACE FUNCTION invoke_pull_fn(
      p_entity_pull_func_name varchar,
      p_client_group_id varchar
    )
    RETURNS SETOF entity_version AS $$
    BEGIN
      RETURN QUERY EXECUTE FORMAT(
        'SELECT * FROM %I(%L)',
        p_entity_pull_func_name,
        p_client_group_id);
    END;
    $$ LANGUAGE plpgsql;`);

  // TODO: Consider just giving up and using a cursor and a loop.
  // Not sure how it would compare perf wise. This CTE stuff is very
  // indirect and magicy.
  await executor(/*sql*/ `CREATE OR REPLACE FUNCTION update_client_view(
      p_entity INTEGER,
      p_entity_pull_func_name VARCHAR,
      p_replicache_client_group VARCHAR(36),
      p_client_view_version INTEGER
    )
    RETURNS void AS $$
    BEGIN
      WITH changes AS (
        SELECT * FROM
          invoke_pull_fn(p_entity_pull_func_name, p_replicache_client_group)
        AS t
        FULL OUTER JOIN (
          SELECT * FROM client_view_entry
          WHERE
            client_group_id = p_replicache_client_group AND
            entity = p_entity
        ) AS cve
        ON t.id = cve.entity_id
        WHERE
          cve.entity_id IS NULL OR
          cve.deleted = true OR
          t.id IS NULL OR (
            cve.entity_id = t.id AND cve.entity_version != t.version
          )
      ),
      to_create AS (
        SELECT * FROM changes
        WHERE
          entity_id IS NULL OR
          deleted = true
      ),
      to_update AS (
        SELECT * FROM changes
        WHERE
          entity_id IS NOT NULL AND
          deleted = false AND
          id IS NOT NULL AND
          entity_version != version
      ),
      to_delete AS (
        SELECT * FROM changes
        WHERE
          entity_id IS NOT NULL AND
          deleted = false AND
          id IS NULL
      ),

      -- creates
      created AS (
        INSERT INTO client_view_entry AS cve (
          SELECT
            p_replicache_client_group as client_group_id,
            p_entity as entity,
            tc.id as entity_id,
            tc.version as entity_version,
            false as deleted,
            p_client_view_version as client_view_version
          FROM to_create tc
        )
        ON CONFLICT (entity, entity_id, client_group_id) DO UPDATE SET
          entity_version = EXCLUDED.entity_version,
          deleted = false,
          client_view_version = EXCLUDED.client_view_version
      ),

      -- updates
      updates AS (
        UPDATE client_view_entry AS cve SET
          entity_version = tu.version,
          deleted = false,
          client_view_version = p_client_view_version
        FROM to_update tu
        WHERE
          cve.client_group_id = p_replicache_client_group AND
          cve.entity = p_entity AND
          cve.entity_id = tu.id
      )

      -- deletes
      UPDATE client_view_entry AS cve SET
        deleted = true,
        client_view_version = p_client_view_version
      FROM to_delete td
      WHERE
        cve.client_group_id = p_replicache_client_group AND
        cve.entity = p_entity AND
        cve.entity_id = td.entity_id;
    END;
    $$ LANGUAGE plpgsql;
  `);

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

  await executor(/*sql*/ `CREATE FUNCTION pull_issue(client_group_id varchar)
    RETURNS TABLE(varchar_column VARCHAR, number_column INTEGER) AS $$
    BEGIN
        RETURN QUERY SELECT id, version FROM issue;
    END;
    $$ LANGUAGE plpgsql`);

  await executor(/*sql*/ `CREATE FUNCTION pull_description(client_group_id varchar)
    RETURNS TABLE(varchar_column VARCHAR, number_column INTEGER) AS $$
    BEGIN
        RETURN QUERY SELECT id, version FROM description;
    END;
    $$ LANGUAGE plpgsql`);

  await executor(/*sql*/ `CREATE FUNCTION pull_comment(client_group_id varchar)
    RETURNS TABLE(varchar_column VARCHAR, number_column INTEGER) AS $$
    BEGIN
        RETURN QUERY SELECT id, version FROM comment;
    END;
    $$ LANGUAGE plpgsql`);

  await executor(/*sql*/ `CREATE FUNCTION pull_client(client_group_id varchar)
    RETURNS TABLE(varchar_column VARCHAR, number_column INTEGER) AS $$
    BEGIN
        RETURN QUERY SELECT id, lastmutationid as version
        FROM replicache_client c
        WHERE c.clientgroupid = client_group_id;
    END;
    $$ LANGUAGE plpgsql`);
}
