import Replicache, { ReadTransaction, WriteTransaction } from "replicache";
import { useSubscribe } from "replicache-react-util";
import { getShape, Shape } from "../shared/shape";
import { getClientState } from "../shared/client-state";
import {
  createShape,
  CreateShapeArgs,
  moveShape,
  MoveShapeArgs,
  overShape,
  OverShapeArgs,
} from "../shared/mutators";
import type Storage from "../shared/storage";
import { newID } from "../shared/id";

/**
 * Abstracts Replicache storage (key/value pairs) to entities (Shape).
 */
export class Data {
  private rep: Replicache;
  readonly clientID: string;

  constructor(rep: Replicache) {
    this.rep = rep;

    // TODO: Use clientID from Replicache:
    // https://github.com/rocicorp/replicache-sdk-js/issues/275
    this.clientID = localStorage.clientID;
    if (!this.clientID) {
      this.clientID = localStorage.clientID = newID();
    }

    this.createShape = rep.register(
      "createShape",
      async (tx: WriteTransaction, args: CreateShapeArgs) => {
        await createShape(this.writeStorage(tx), args);
      }
    );

    this.moveShape = rep.register(
      "moveShape",
      async (tx: WriteTransaction, args: MoveShapeArgs) => {
        await moveShape(this.writeStorage(tx), args);
      }
    );

    this.overShape = rep.register(
      "overShape",
      async (tx: WriteTransaction, args: OverShapeArgs) => {
        await overShape(this.writeStorage(tx), args);
      }
    );
  }

  // TODO: Is there a way for Typescript to infer this from the assignment in constructor?
  readonly createShape: (args: CreateShapeArgs) => Promise<void>;
  readonly moveShape: (args: MoveShapeArgs) => Promise<void>;
  readonly overShape: (args: OverShapeArgs) => Promise<void>;

  useShapeIDs(): Array<string> {
    return useSubscribe(
      this.rep,
      async (tx: ReadTransaction) => {
        const shapes = await tx.scanAll({ prefix: "shape-" });
        return shapes.map(([k, _]) => k.split("-")[1]);
      },
      []
    );
  }

  useShapeByID(id: string): Shape | null {
    return useSubscribe(
      this.rep,
      (tx: ReadTransaction) => {
        return getShape(this.readStorage(tx), id);
      },
      null
    );
  }

  useOverShapeID(): string | null {
    return useSubscribe(this.rep, async (tx: ReadTransaction) => {
      return (await getClientState(this.readStorage(tx), this.clientID)).overID;
    });
  }

  private readStorage(tx: ReadTransaction): Storage {
    return {
      getObject: tx.get.bind(tx),
      putObject: () => {
        throw new Error("Cannot write inside ReadTransaction");
      },
    };
  }

  private writeStorage(tx: WriteTransaction): Storage {
    return Object.assign(this.readStorage(tx), {
      putObject: tx.put.bind(tx),
    });
  }
}
