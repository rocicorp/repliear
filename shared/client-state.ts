import * as t from "io-ts";
import { must } from "../backend/decode";
import { ReadStorage, WriteStorage } from "./storage";
import { randInt } from "./rand";

const colors = [
  "#f94144",
  "#f3722c",
  "#f8961e",
  "#f9844a",
  "#f9c74f",
  "#90be6d",
  "#43aa8b",
  "#4d908e",
  "#577590",
  "#277da1",
];
const avatars = [
  ["🐶", "Puppy"],
  ["🐱", "Kitty"],
  ["🐭", "Mouse"],
  ["🐹", "Hamster"],
  ["🐰", "Bunny"],
  ["🦊", "Fox"],
  ["🐻", "Bear"],
  ["🐼", "Panda"],
  ["🐻‍❄️", "Polar Bear"],
  ["🐨", "Koala"],
  ["🐯", "Tiger"],
  ["🦁", "Lion"],
  ["🐮", "Cow"],
  ["🐷", "Piggy"],
  ["🐵", "Monkey"],
  ["🐣", "Chick"],
];

export const userInfo = t.type({
  avatar: t.string,
  name: t.string,
  color: t.string,
});

// TODO: It would be good to merge this with the first-class concept of `client`
// that Replicache itself manages if possible.
export const clientState = t.type({
  cursor: t.type({
    x: t.number,
    y: t.number,
  }),
  overID: t.string,
  selectedID: t.string,
  userInfo: userInfo,
});

export type UserInfo = t.TypeOf<typeof userInfo>;
export type ClientState = t.TypeOf<typeof clientState>;

export async function initClientState(
  storage: WriteStorage,
  { id, defaultUserInfo }: { id: string; defaultUserInfo: UserInfo }
): Promise<void> {
  if (await storage.getObject(key(id))) {
    return;
  }
  await putClientState(storage, {
    id,
    clientState: {
      cursor: {
        x: 0,
        y: 0,
      },
      overID: "",
      selectedID: "",
      userInfo: defaultUserInfo,
    },
  });
}

export async function getClientState(
  storage: ReadStorage,
  id: string
): Promise<ClientState> {
  const jv = await storage.getObject(key(id));
  if (!jv) {
    throw new Error("Expected clientState to be initialized already: " + id);
  }
  return must(clientState.decode(jv));
}

export function putClientState(
  storage: WriteStorage,
  { id, clientState }: { id: string; clientState: ClientState }
): Promise<void> {
  return storage.putObject(key(id), clientState);
}

export async function setCursor(
  storage: WriteStorage,
  { id, x, y }: { id: string; x: number; y: number }
): Promise<void> {
  const clientState = await getClientState(storage, id);
  clientState.cursor.x = x;
  clientState.cursor.y = y;
  await putClientState(storage, { id, clientState });
}

export async function overShape(
  storage: WriteStorage,
  { clientID, shapeID }: { clientID: string; shapeID: string }
): Promise<void> {
  const client = await getClientState(storage, clientID);
  client.overID = shapeID;
  await putClientState(storage, { id: clientID, clientState: client });
}

export async function selectShape(
  storage: WriteStorage,
  { clientID, shapeID }: { clientID: string; shapeID: string }
): Promise<void> {
  const client = await getClientState(storage, clientID);
  client.selectedID = shapeID;
  await putClientState(storage, { id: clientID, clientState: client });
}

export function randUserInfo(): UserInfo {
  const [avatar, name] = avatars[randInt(0, avatars.length - 1)];
  return {
    avatar,
    name,
    color: colors[randInt(0, colors.length - 1)],
  };
}

function key(id: string): string {
  return `${keyPrefix}${id}`;
}

export const keyPrefix = `client-state-`;
