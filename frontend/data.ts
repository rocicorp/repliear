import Replicache, {
  JSONObject,
  ReadTransaction,
  WriteTransaction,
} from "replicache";
import { useSubscribe } from "replicache-react-util";
import { Shape } from "../shared/shape";
import { ClientState } from "../shared/client-state";
import {
  createShape,
  CreateShapeArgs,
  moveShape,
  MoveShapeArgs,
  overShape,
  OverShapeArgs,
} from "../shared/mutators";
import type { MutatorStorage } from "../shared/mutators";
import { newID } from "../shared/id";
import { Type } from "io-ts";

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
        await createShape(this.mutatorStorage(tx), args);
      }
    );

    this.moveShape = rep.register(
      "moveShape",
      async (tx: WriteTransaction, args: MoveShapeArgs) => {
        await moveShape(this.mutatorStorage(tx), args);
      }
    );

    this.overShape = rep.register(
      "overShape",
      async (tx: WriteTransaction, args: OverShapeArgs) => {
        await overShape(this.mutatorStorage(tx), args);
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
        return this.getShape(tx, id);
      },
      null
    );
  }

  useOverShapeID(): string | null {
    return useSubscribe(this.rep, async (tx: ReadTransaction) => {
      return (await this.getClientState(tx, this.clientID)).overID;
    });
  }

  private async getShape(
    tx: ReadTransaction,
    id: string
  ): Promise<Shape | null> {
    // TODO: validate returned shape - can be wrong in case app reboots with
    // new code and old storage. We can decode, but then what?
    // See https://github.com/rocicorp/replicache-sdk-js/issues/285.
    return ((await tx.get(`shape-${id}`)) as unknown) as Shape | null;
  }

  private async putShape(tx: WriteTransaction, id: string, shape: Shape) {
    return await tx.put(`shape-${id}`, (shape as unknown) as JSONObject);
  }

  private async getClientState(
    tx: ReadTransaction,
    id: string
  ): Promise<ClientState> {
    return (
      (((await tx.get(
        `client-state-${id}`
      )) as unknown) as ClientState | null) || {
        overID: "",
      }
    );
  }

  private async putClientState(
    tx: WriteTransaction,
    id: string,
    client: ClientState
  ) {
    return await tx.put(
      `client-state-${id}`,
      (client as unknown) as JSONObject
    );
  }

  private mutatorStorage(tx: WriteTransaction): MutatorStorage {
    return {
      getShape: this.getShape.bind(null, tx),
      putShape: this.putShape.bind(null, tx),
      getClientState: this.getClientState.bind(null, tx),
      putClientState: this.putClientState.bind(null, tx),
    };
  }
}
