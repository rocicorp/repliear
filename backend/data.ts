import type { ExecuteStatementFn } from "./rds";
import { JSONValue } from "replicache";

export async function getCookie(
  executor: ExecuteStatementFn,
  docID: string
): Promise<string> {
  const result = await executor(
    "SELECT UNIX_TIMESTAMP(MAX(LastModified)) FROM Object WHERE DocumentID = :docID",
    {
      docID: { stringValue: docID },
    }
  );
  const version = result.records?.[0]?.[0]?.stringValue;
  return version || "";
}

export async function getLastMutationID(
  executor: ExecuteStatementFn,
  clientID: string
): Promise<number> {
  const result = await executor(
    "SELECT LastMutationID FROM Client WHERE Id = :id",
    {
      id: { stringValue: clientID },
    }
  );
  return result.records?.[0]?.[0]?.longValue ?? 0;
}

export async function setLastMutationID(
  executor: ExecuteStatementFn,
  clientID: string,
  lastMutationID: number
): Promise<void> {
  await executor(
    "INSERT INTO Client (Id, LastMutationID) VALUES (:id, :lastMutationID) " +
      "ON DUPLICATE KEY UPDATE Id = :id, LastMutationID = :lastMutationID",
    {
      id: { stringValue: clientID },
      lastMutationID: { longValue: lastMutationID },
    }
  );
}

export async function getObject(
  executor: ExecuteStatementFn,
  documentID: string,
  key: string
): Promise<JSONValue | undefined> {
  const { records } = await executor(
    "SELECT V FROM Object WHERE DocumentID =:docID AND K = :key AND Deleted = False",
    {
      key: { stringValue: key },
      docID: { stringValue: documentID },
    }
  );
  const value = records?.[0]?.[0]?.stringValue;
  if (!value) {
    return undefined;
  }
  return JSON.parse(value);
}

export async function putObject(
  executor: ExecuteStatementFn,
  docID: string,
  key: string,
  value: JSONValue
): Promise<void> {
  await executor(
    `
    INSERT INTO Object (DocumentID, K, V, Deleted)
    VALUES (:docID, :key, :value, False)
      ON DUPLICATE KEY UPDATE V = :value, Deleted = False
    `,
    {
      docID: { stringValue: docID },
      key: { stringValue: key },
      value: { stringValue: JSON.stringify(value) },
    }
  );
}

export async function delObject(
  executor: ExecuteStatementFn,
  docID: string,
  key: string
): Promise<void> {
  await executor(
    `
    UPDATE Object SET Deleted = True
    WHERE DocumentID = :docID AND K = :key
  `,
    {
      docID: { stringValue: docID },
      key: { stringValue: key },
    }
  );
}
