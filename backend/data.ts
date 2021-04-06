import type { ExecuteStatementFn } from "./rds";
import { JSONValue } from "replicache";

export async function getCookieVersion(
  executor: ExecuteStatementFn,
  docID: string
): Promise<number> {
  const result = await executor(
    "SELECT Version FROM Cookie WHERE DocumentID = :docID LIMIT 1",
    {
      docID: { stringValue: docID },
    }
  );
  const version = result.records?.[0]?.[0]?.longValue;
  if (version === undefined) {
    throw new Error("Could not get version field");
  }
  return version;
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

export async function getObject<T extends JSONValue>(
  executor: ExecuteStatementFn,
  key: string
): Promise<T | null> {
  const { records } = await executor(
    "SELECT V FROM Object WHERE K = :key AND Deleted = False",
    {
      key: { stringValue: key },
    }
  );
  const value = records?.[0]?.[0]?.stringValue;
  if (!value) {
    return null;
  }
  return JSON.parse(value);
}

export async function putObject<T extends JSONValue>(
  executor: ExecuteStatementFn,
  docID: string,
  key: string,
  value: JSONValue
): Promise<void> {
  await executor(`CALL PutObject(:docID, :key, :value, :deleted)`, {
    docID: { stringValue: docID },
    key: { stringValue: key },
    value: { stringValue: JSON.stringify(value) },
    deleted: { booleanValue: false },
  });
}

export async function delObject<T extends JSONValue>(
  executor: ExecuteStatementFn,
  docID: string,
  key: string
): Promise<void> {
  await executor(`CALL PutObject(:docID, :key, :value, :deleted)`, {
    docID: { stringValue: docID },
    key: { stringValue: key },
    value: { stringValue: "" },
    deleted: { booleanValue: true },
  });
}

export async function delAllObjects<T extends JSONValue>(
  executor: ExecuteStatementFn,
  docID: string
): Promise<void> {
  await executor(`CALL DeleteAllObjects(:docID)`, {
    docID: { stringValue: docID },
  });
}
