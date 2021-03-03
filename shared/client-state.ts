import * as t from "io-ts";
import { must } from "../backend/decode";
import Storage from "./storage";

// TODO: It would be good to merge this with the first-class concept of `client`
// that Replicache itself manages if possible.
export const clientState = t.type({
  overID: t.string,
});

export type ClientState = t.TypeOf<typeof clientState>;

export async function getClientState(
  storage: Storage,
  id: string
): Promise<ClientState> {
  const jv = await storage.getObject(key(id));
  return jv ? must(clientState.decode(jv)) : { overID: "" };
}

export function putClientState(
  storage: Storage,
  id: string,
  clientState: ClientState
): Promise<void> {
  return storage.putObject(key(id), clientState);
}

export async function overShape(
  storage: Storage,
  { clientID, shapeID }: { clientID: string; shapeID: string }
): Promise<void> {
  const client = await getClientState(storage, clientID);
  client.overID = shapeID;
  await putClientState(storage, clientID, client);
}

function key(id: string): string {
  return `client-state-${id}`;
}
