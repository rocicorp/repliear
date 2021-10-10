import { Replicache, ReadTransaction } from "replicache";
import type { JSONValue } from "replicache";
import { useSubscribe } from "replicache-react";
import { getShape } from "../frontend/shape";
import { getClientState, clientStatePrefix } from "../frontend/client-state";
import type { UserInfo } from "../frontend/client-state";
import { mutators } from "../frontend/mutators";

/**
 * Abstracts Replicache storage (key/value pairs) to entities (Shape).
 */
export type Data = Await<ReturnType<typeof createData>>;
type Await<T> = T extends PromiseLike<infer U> ? U : T;

export async function createData(
  rep: Replicache<typeof mutators>,
  defaultUserInfo: UserInfo
) {
  let clientID = await rep.clientID;

  function subscribe<T extends JSONValue>(
    def: T,
    f: (tx: ReadTransaction) => Promise<T>
  ): T {
    return useSubscribe(rep, f, def);
  }

  await rep.mutate.initClientState({
    id: clientID,
    defaultUserInfo,
  });

  return {
    clientID,

    get rep(): Replicache {
      return rep;
    },

    ...rep.mutate,

    // subscriptions
    useShapeIDs: () =>
      subscribe([], async (tx: ReadTransaction) => {
        const shapes = await tx.scan({ prefix: "shape-" }).keys().toArray();
        return shapes.map((k) => k.split("-", 2)[1]);
      }),

    useShapeByID: (id: string) =>
      subscribe(null, (tx: ReadTransaction) => {
        return getShape(tx, id);
      }),

    useUserInfo: (clientID: string) =>
      subscribe(null, async (tx: ReadTransaction) => {
        return (await getClientState(tx, clientID)).userInfo;
      }),

    useOverShapeID: () =>
      subscribe("", async (tx: ReadTransaction) => {
        return (await getClientState(tx, clientID)).overID;
      }),

    useSelectedShapeID: () =>
      subscribe("", async (tx: ReadTransaction) => {
        return (await getClientState(tx, clientID)).selectedID;
      }),

    useCollaboratorIDs: (clientID: string) =>
      subscribe([], async (tx: ReadTransaction) => {
        const r = [];
        for await (let k of tx.scan({ prefix: clientStatePrefix }).keys()) {
          if (!k.endsWith(clientID)) {
            r.push(k.substr(clientStatePrefix.length));
          }
        }
        return r;
      }),

    useClientInfo: (clientID: string) =>
      subscribe(null, async (tx: ReadTransaction) => {
        return await getClientState(tx, clientID);
      }),
  };
}
