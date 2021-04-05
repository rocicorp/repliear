// Low-level config and utilities for RDS.

import {
  BeginTransactionCommand,
  CommitTransactionCommand,
  ExecuteStatementCommand,
  ExecuteStatementCommandOutput,
  Field,
  RDSDataClient,
  RollbackTransactionCommand,
} from "@aws-sdk/client-rds-data";

const region = process.env.AMAZON_REGION || "us-west-2";
const dbName = process.env.REPLIDRAW_DB_NAME || "replidraw";
const resourceArn = process.env.REPLIDRAW_RESOURCE_ARN;
const secretArn = process.env.REPLIDRAW_SECRET_ARN;

if (!resourceArn || !secretArn) {
  throw new Error(
    "REPLIDRAW_RESOURCE_ARN and REPLIDRAW_SECRET_ARN environment variables are required"
  );
}

const client = new RDSDataClient({
  region,
  // TODO: How to have it fall back to the .aws/credentials file?
  credentials: {
    accessKeyId: process.env.AMAZON_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.AMAZON_SECRET_ACCESS_KEY ?? "",
  },
});

export type ExecuteStatementFn = typeof executeStatement;
export type TransactionBodyFn = (executor: ExecuteStatementFn) => Promise<void>;

/**
 * Invokes a supplied function within an RDS transaction.
 * @param body Function to invoke. If this throws, the transaction will be rolled
 * back. The thrown error will be re-thrown.
 */
export async function transact(body: TransactionBodyFn) {
  const transactionId = (
    await client.send(
      new BeginTransactionCommand({
        resourceArn,
        secretArn,
        database: dbName,
      })
    )
  ).transactionId;
  try {
    await body(async (sql, parameters) => {
      return await executeStatementInDatabase(
        dbName,
        sql,
        parameters,
        transactionId
      );
    });
  } catch (e) {
    await client.send(
      new RollbackTransactionCommand({
        resourceArn,
        secretArn,
        transactionId,
      })
    );
    throw e;
  }
  await client.send(
    new CommitTransactionCommand({
      resourceArn,
      secretArn,
      transactionId,
    })
  );
}

export async function createDatabase() {
  await executeStatementInDatabase(null, `DROP DATABASE IF EXISTS ${dbName}`);

  await executeStatementInDatabase(
    null,
    `CREATE DATABASE ${dbName}
    CHARACTER SET utf8mb4`
  );

  await executeStatement(`CREATE TABLE Cookie (
    Version BIGINT NOT NULL)`);
  await executeStatement(`CREATE TABLE Client (
    Id VARCHAR(100) PRIMARY KEY NOT NULL,
    LastMutationID BIGINT NOT NULL,
    LastModified TIMESTAMP NOT NULL
      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)`);

  // For simplicity of demo purposes, and because we don't really need any
  // advanced backend features, we model backend storage as a kv store. This
  // allows us to share code more easily and reduces the amount of schema
  // management goop.
  //
  // There's no particular reason that you couldn't use a fully-normalized
  // relational model on the backend if you want (or need to for legacy)
  // reasons. Just more work!
  await executeStatement(`CREATE TABLE Object (
    K VARCHAR(100) PRIMARY KEY NOT NULL,
    V TEXT NOT NULL,
    Deleted BOOL NOT NULL DEFAULT False,
    Version BIGINT NOT NULL,
    LastModified TIMESTAMP NOT NULL
      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX (Version))`);

  await executeStatement(`INSERT INTO Cookie (Version) VALUES (0)`);

  // To calculate which rows have changed for return in the pull endpoint, we
  // use a very simply global version number. This is easy to understand but
  // does serialize writes.
  //
  // There are many different strategies for calculating changed rows and the
  // details are very dependent on what you are building. Contact us if you'd
  // like help: https://replicache.dev/#contact.
  await executeStatement(`CREATE PROCEDURE NextVersion (OUT result BIGINT)
    BEGIN
      UPDATE Cookie SET Version = Version + 1;
      SELECT Version INTO result FROM Cookie;
    END`);

  await executeStatement(`CREATE PROCEDURE PutObject (IN pK VARCHAR(255), IN pV TEXT, IN pDeleted BOOL)
    BEGIN
      SET @version = 0;
      CALL NextVersion(@version);
      INSERT INTO Object (K, V, Deleted, Version) VALUES (pK, pV, pDeleted, @version) 
        ON DUPLICATE KEY UPDATE V = pV, Deleted = pDeleted, Version = @version;
    END`);

  await executeStatement(`CREATE PROCEDURE DeleteAllObjects ()
    BEGIN
      SET @version = 0;
      CALL NextVersion(@version);
      UPDATE Object SET Deleted = True, Version = @version WHERE K LIKE 'shape-%';
    END`);
}

async function executeStatement(
  sql: string,
  parameters?: { [name: string]: Field }
): Promise<ExecuteStatementCommandOutput> {
  return await executeStatementInDatabase(dbName, sql, parameters);
}

async function executeStatementInDatabase(
  database: string | null,
  sql: string,
  parameters?: { [name: string]: Field },
  transactionId?: string
): Promise<ExecuteStatementCommandOutput> {
  const params =
    parameters &&
    Object.entries(parameters).map(([name, value]) => ({
      name,
      value,
    }));
  console.log("Executing", database, sql, JSON.stringify(params, null, ""));
  const command = new ExecuteStatementCommand({
    database: database ?? "",
    resourceArn,
    secretArn,
    sql,
    parameters: params,
    transactionId,
  });
  return await client.send(command);
}
