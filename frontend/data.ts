import Replicache, {
  JSONObject,
  ReadTransaction,
  WriteTransaction,
} from "replicache";
import { useSubscribe } from "replicache-react-util";
import { Shape } from "../shared/shape";
import {
  createShape,
  CreateShapeArgs,
  moveShape,
  MoveShapeArgs,
} from "../shared/mutators";
import type { MutatorStorage } from "../shared/mutators";

/**
 * Abstracts Replicache storage (key/value pairs) to entities (Shape).
 */
export class Data {
  private rep: Replicache;

  constructor(rep: Replicache) {
    this.rep = rep;

    this.createShape = rep.register(
      "createShape",
      async (tx: WriteTransaction, args: CreateShapeArgs) => {
        await createShape(this.mutatorStorage(tx), args);
      }
    );

    this.moveShape = rep.register(
      "moveShape",
      async (tx: WriteTransaction, args: MoveShapeArgs) => {
        await moveShape(this.mutatorStorage(tx), args);
      }
    );
  }

  // TODO: Is there a way for Typescript to infer this from the assignment in constructor?
  readonly createShape: (args: CreateShapeArgs) => Promise<void>;
  readonly moveShape: (args: MoveShapeArgs) => Promise<void>;

  useShapeIDs(): Array<string> {
    return useSubscribe(
      this.rep,
      async (tx: ReadTransaction) => {
        const shapes = await tx.scanAll({ prefix: "/shape/" });
        return shapes.map(([k, _]) => k.split("/")[2]);
      },
      []
    );
  }

  useShapeByID(id: string): Shape | null {
    return useSubscribe(
      this.rep,
      (tx: ReadTransaction) => {
        return this.getShape(tx, id);
      },
      null
    );
  }

  private async getShape(tx: ReadTransaction, id: string): Promise<Shape> {
    // TODO: validate returned shape - can be wrong in case app reboots with
    // new code and old storage. We can decode, but then what?
    // See https://github.com/rocicorp/replicache-sdk-js/issues/285.
    return ((await tx.get(`/shape/${id}`)) as unknown) as Shape;
  }

  private async putShape(tx: WriteTransaction, id: string, shape: Shape) {
    return await tx.put(`/shape/${id}`, (shape as unknown) as JSONObject);
  }

  private mutatorStorage(tx: WriteTransaction): MutatorStorage {
    return {
      getShape: this.getShape.bind(null, tx),
      putShape: this.putShape.bind(null, tx),
    };
  }
}
