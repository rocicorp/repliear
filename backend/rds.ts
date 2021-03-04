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

const region = "us-west-2";
const dbName =
  process.env.REPLIDRAW_DB_NAME || "replicache_sample_replidraw__dev";
console.log({ dbName });
const resourceArn =
  "arn:aws:rds:us-west-2:712907626835:cluster:replicache-demo-notes";
const secretArn =
  "arn:aws:secretsmanager:us-west-2:712907626835:secret:rds-db-credentials/cluster-X5NALMLWZ34K55M5ZZVPN2IYOI/admin-65L3ia";

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

/**
 * Creates our databse in RDS if necessary.
 */
export async function ensureDatabase() {
  const result = await executeStatementInDatabase(null, "SHOW DATABASES");
  if (result.records) {
    if (result.records.find((record) => record[0].stringValue === dbName)) {
      // TODO: Maybe migrate version
      return;
    }
  }

  await createDatabase();
}

async function createDatabase() {
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
  await executeStatement(`CREATE TABLE Object (
    K VARCHAR(100) PRIMARY KEY NOT NULL,
    V TEXT NOT NULL,
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

  await executeStatement(`CREATE PROCEDURE PutObject (IN pK VARCHAR(255), IN pV TEXT)
    BEGIN
      SET @version = 0;
      CALL NextVersion(@version);
      INSERT INTO Object (K, V, Version) VALUES (pK, pV, @version) 
        ON DUPLICATE KEY UPDATE V = pV, Version = @version;
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
  console.log("Executing", database, sql, JSON.stringify(params, null, ''));
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
