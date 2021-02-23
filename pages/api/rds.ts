import {
    RDSDataClient,
    ExecuteStatementCommand,
    ExecuteStatementCommandOutput,
    Field,
  } from "@aws-sdk/client-rds-data";
  
const region = 'us-west-2';
const dbName = 'repliache_sample_replidraw__dev_aa';
const resourceArn = 'arn:aws:rds:us-west-2:712907626835:cluster:replicache-demo-notes';
const secretArn = 'arn:aws:secretsmanager:us-west-2:712907626835:secret:rds-db-credentials/cluster-X5NALMLWZ34K55M5ZZVPN2IYOI/admin-65L3ia';

export const client = new RDSDataClient({
  region,
  // TODO: How to have it fall back to the .aws/credentials file?
  credentials: {
     accessKeyId: process.env.AMAZON_ACCESS_KEY_ID,
     secretAccessKey: process.env.AMAZON_SECRET_ACCESS_KEY,
  },
});

export async function executeStatement(
    sql: string, 
    parameters?: {[name: string]: Field})
      : Promise<ExecuteStatementCommandOutput> {
  return await executeStatementInDatabase(dbName, sql, parameters);        
}

export async function ensureDatabase() {
  const result = await executeStatementInDatabase(null, 'SHOW DATABASES');
  if (result.records.find(record => record[0].stringValue == dbName)) {
    // TODO: Maybe migrate version
    return;
  }
  
  await createDatabase();
}
  
async function createDatabase() {
  await executeStatementInDatabase(null, 'CREATE DATABASE ' + dbName);
  await executeStatement('CREATE TABLE Client (Id VARCHAR(255) PRIMARY KEY NOT NULL, LastMutationID BIGINT NOT NULL)');
  await executeStatement('CREATE TABLE Shape (Id VARCHAR(255) PRIMARY KEY NOT NULL, Content TEXT)');
}

async function executeStatementInDatabase(
  database: string,
  sql: string, 
  parameters?: {[name: string]: Field})
    : Promise<ExecuteStatementCommandOutput> {
  const params = parameters && Object.entries(parameters).map(([name, value]) => ({
    name,
    value,
  }));
  console.log('Executing', database, sql, params);
  const command = new ExecuteStatementCommand({
    database,
    resourceArn,
    secretArn,
    sql,
    parameters: params,
  });
  return await client.send(command);
}
