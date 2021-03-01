/**
 * Abstract RDS (SQL) to entities (Shape, Client).
 */

import { shape } from "../shared/shape";
import { clientState } from "../shared/client-state";
import { must } from "./decode";

import type { ExecuteStatementFn } from "./rds";
import type { Shape } from "../shared/shape";
import type { ClientState } from "../shared/client-state";

export async function getCookieVersion(
  executor: ExecuteStatementFn
): Promise<number> {
  const result = await executor("SELECT Version FROM Cookie LIMIT 1");
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

export async function getShape(
  executor: ExecuteStatementFn,
  id: string
): Promise<Shape | null> {
  const { records } = await executor(
    "SELECT Content FROM Shape WHERE Id = :id",
    {
      id: { stringValue: id },
    }
  );
  const content = records?.[0]?.[0]?.stringValue;
  if (!content) {
    return null;
  }
  return must(shape.decode(JSON.parse(content)));
}

export async function putShape(
  executor: ExecuteStatementFn,
  id: string,
  shape: Shape
): Promise<void> {
  await executor(`CALL PutShape(:id, :content)`, {
    id: { stringValue: id },
    content: { stringValue: JSON.stringify(shape) },
  });
}

export async function getClientState(
  executor: ExecuteStatementFn,
  id: string
): Promise<ClientState> {
  const { records } = await executor(
    "SELECT Content FROM ClientState WHERE Id = :id",
    {
      id: { stringValue: id },
    }
  );
  const content = records?.[0]?.[0]?.stringValue;
  if (!content) {
    return {
      overID: "",
    };
  }
  return must(clientState.decode(JSON.parse(content)));
}

export async function putClientState(
  executor: ExecuteStatementFn,
  id: string,
  clientState: ClientState
): Promise<void> {
  await executor(`CALL PutClientState(:id, :content)`, {
    id: { stringValue: id },
    content: { stringValue: JSON.stringify(clientState) },
  });
}
