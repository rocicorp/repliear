import Replicache, { ReadTransaction, WriteTransaction } from "replicache";
import { useSubscribe } from "replicache-react-util";
import { getShape, Shape, putShape, moveShape } from "../shared/shape";
import { getClientState, overShape } from "../shared/client-state";
import type Storage from "../shared/storage";
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

  return {
    clientID,

    // mutators
    createShape: rep.register(
      "createShape",
      async (tx: WriteTransaction, args: { id: string; shape: Shape }) => {
        await putShape(writeStorage(tx), args);
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

    overShape: rep.register(
      "overShape",
      async (
        tx: WriteTransaction,
        args: { clientID: string; shapeID: string }
      ) => {
        await overShape(writeStorage(tx), args);
      }
    ),

    // subscriptions
    useShapeIDs(): Array<string> {
      return useSubscribe(
        rep,
        async (tx: ReadTransaction) => {
          const shapes = await tx.scanAll({ prefix: "shape-" });
          return shapes.map(([k, _]) => k.split("-")[1]);
        },
        []
      );
    },

    useShapeByID(id: string): Shape | null {
      return useSubscribe(
        rep,
        (tx: ReadTransaction) => {
          return getShape(readStorage(tx), id);
        },
        null
      );
    },

    useOverShapeID(): string | null {
      return useSubscribe(
        rep,
        async (tx: ReadTransaction) => {
          return (await getClientState(readStorage(tx), clientID)).overID;
        },
        null
      );
    },
  };
}

function readStorage(tx: ReadTransaction): Storage {
  return {
    getObject: tx.get.bind(tx),
    putObject: () => {
      throw new Error("Cannot write inside ReadTransaction");
    },
  };
}

function writeStorage(tx: WriteTransaction): Storage {
  return Object.assign(readStorage(tx), {
    putObject: tx.put.bind(tx),
  });
}
