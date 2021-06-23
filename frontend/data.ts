import { Replicache, ReadTransaction, WriteTransaction } from "replicache";
import type { JSONValue } from "replicache";
import { useSubscribe } from "replicache-react";
import {
  getShape,
  Shape,
  putShape,
  moveShape,
  resizeShape,
  rotateShape,
  deleteShape,
  randomShape,
  initShapes,
} from "../shared/shape";
import {
  getClientState,
  overShape,
  initClientState,
  setCursor,
  keyPrefix as clientStatePrefix,
  selectShape,
} from "../shared/client-state";
import type { ReadStorage, WriteStorage } from "../shared/storage";
import type { UserInfo } from "../shared/client-state";

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
        return getShape(readStorage(tx), id);
      }),

    useUserInfo: (clientID: string) =>
      subscribe(null, async (tx: ReadTransaction) => {
        return (await getClientState(readStorage(tx), clientID)).userInfo;
      }),

    useOverShapeID: () =>
      subscribe("", async (tx: ReadTransaction) => {
        return (await getClientState(readStorage(tx), clientID)).overID;
      }),

    useSelectedShapeID: () =>
      subscribe("", async (tx: ReadTransaction) => {
        return (await getClientState(readStorage(tx), clientID)).selectedID;
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
        return await getClientState(readStorage(tx), clientID);
      }),
  };
}

export const mutators = {
  async createShape(tx: WriteTransaction, args: { id: string; shape: Shape }) {
    await putShape(writeStorage(tx), args);
  },

  async deleteShape(tx: WriteTransaction, id: string) {
    await deleteShape(writeStorage(tx), id);
  },

  async moveShape(
    tx: WriteTransaction,
    args: { id: string; dx: number; dy: number }
  ) {
    await moveShape(writeStorage(tx), args);
  },

  async resizeShape(tx: WriteTransaction, args: { id: string; ds: number }) {
    await resizeShape(writeStorage(tx), args);
  },

  async rotateShape(tx: WriteTransaction, args: { id: string; ddeg: number }) {
    await rotateShape(writeStorage(tx), args);
  },

  async initClientState(
    tx: WriteTransaction,
    args: { id: string; defaultUserInfo: UserInfo }
  ) {
    await initClientState(writeStorage(tx), args);
  },

  async setCursor(
    tx: WriteTransaction,
    args: { id: string; x: number; y: number }
  ) {
    await setCursor(writeStorage(tx), args);
  },

  async overShape(
    tx: WriteTransaction,
    args: { clientID: string; shapeID: string }
  ) {
    await overShape(writeStorage(tx), args);
  },

  async selectShape(
    tx: WriteTransaction,
    args: { clientID: string; shapeID: string }
  ) {
    await selectShape(writeStorage(tx), args);
  },

  async deleteAllShapes(tx: WriteTransaction) {
    await Promise.all(
      (await tx.scan({ prefix: `shape-` }).keys().toArray()).map((k) =>
        tx.del(k)
      )
    );
  },
};

export function readStorage(tx: ReadTransaction): ReadStorage {
  return {
    getObject: (key: string) => tx.get(key),
  };
}

function writeStorage(tx: WriteTransaction): WriteStorage {
  return Object.assign(readStorage(tx), {
    putObject: (key: string, value: JSONValue) => tx.put(key, value),
    delObject: async (key: string) => void (await tx.del(key)),
  });
}
