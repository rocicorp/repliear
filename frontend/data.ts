import Replicache, { ReadTransaction, WriteTransaction } from "replicache";
import type { JSONValue } from "replicache";
import { useSubscribe } from "replicache-react-util";
import {
  getShape,
  Shape,
  putShape,
  moveShape,
  resizeShape,
  rotateShape,
  deleteShape,
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
import { newID } from "../shared/id";

/**
 * Abstracts Replicache storage (key/value pairs) to entities (Shape).
 */
export type Data = ReturnType<typeof createData>;

export function createData(rep: Replicache) {
  // TODO: Use clientID from Replicache:
  // https://github.com/rocicorp/replicache-sdk-js/issues/275
  let clientID = localStorage.clientID;
  if (!clientID) {
    clientID = localStorage.clientID = newID();
  }

  function subscribe<T extends JSONValue>(
    def: T,
    f: (tx: ReadTransaction) => Promise<T>
  ): T {
    return useSubscribe(rep, f, def);
  }

  return {
    clientID,

    // mutators
    createShape: rep.register(
      "createShape",
      async (tx: WriteTransaction, args: { id: string; shape: Shape }) => {
        await putShape(writeStorage(tx), args);
      }
    ),

    deleteShape: rep.register(
      "deleteShape",
      async (tx: WriteTransaction, id: string) => {
        await deleteShape(writeStorage(tx), id);
      }
    ),

    moveShape: rep.register(
      "moveShape",
      async (
        tx: WriteTransaction,
        args: { id: string; dx: number; dy: number }
      ) => {
        await moveShape(writeStorage(tx), args);
      }
    ),

    resizeShape: rep.register(
      "resizeShape",
      async (tx: WriteTransaction, args: { id: string; ds: number }) => {
        await resizeShape(writeStorage(tx), args);
      }
    ),

    rotateShape: rep.register(
      "rotateShape",
      async (tx: WriteTransaction, args: { id: string; ddeg: number }) => {
        await rotateShape(writeStorage(tx), args);
      }
    ),

    initClientState: rep.register(
      "initClientState",
      async (
        tx: WriteTransaction,
        args: { id: string; defaultUserInfo: UserInfo }
      ) => {
        await initClientState(writeStorage(tx), args);
      }
    ),

    setCursor: rep.register(
      "setCursor",
      async (
        tx: WriteTransaction,
        args: { id: string; x: number; y: number }
      ) => {
        await setCursor(writeStorage(tx), args);
      }
    ),

    overShape: rep.register(
      "overShape",
      async (
        tx: WriteTransaction,
        args: { clientID: string; shapeID: string }
      ) => {
        await overShape(writeStorage(tx), args);
      }
    ),

    selectShape: rep.register(
      "selectShape",
      async (
        tx: WriteTransaction,
        args: { clientID: string; shapeID: string }
      ) => {
        await selectShape(writeStorage(tx), args);
      }
    ),

    // subscriptions
    useShapeIDs: () =>
      subscribe([], async (tx: ReadTransaction) => {
        const shapes = await tx.scanAll({ prefix: "shape-" });
        return shapes.map(([k, _]) => k.split("-")[1]);
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

function readStorage(tx: ReadTransaction): ReadStorage {
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
