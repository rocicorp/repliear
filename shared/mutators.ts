import { WriteTransaction } from "replicache";
import {
  initClientState,
  setCursor,
  overShape,
  selectShape,
  UserInfo,
} from "./client-state";
import {
  Shape,
  putShape,
  deleteShape,
  moveShape,
  resizeShape,
  rotateShape,
  initShapes,
  shapePrefix as shapePrefix,
} from "./shape";

export const mutators = {
  async createShape(tx: WriteTransaction, args: { id: string; shape: Shape }) {
    await putShape(tx, args);
  },

  async deleteShape(tx: WriteTransaction, id: string) {
    await deleteShape(tx, id);
  },

  async moveShape(
    tx: WriteTransaction,
    args: { id: string; dx: number; dy: number }
  ) {
    await moveShape(tx, args);
  },

  async resizeShape(tx: WriteTransaction, args: { id: string; ds: number }) {
    await resizeShape(tx, args);
  },

  async rotateShape(tx: WriteTransaction, args: { id: string; ddeg: number }) {
    await rotateShape(tx, args);
  },

  async initClientState(
    tx: WriteTransaction,
    args: { id: string; defaultUserInfo: UserInfo }
  ) {
    await initClientState(tx, args);
  },

  async setCursor(
    tx: WriteTransaction,
    args: { id: string; x: number; y: number }
  ) {
    await setCursor(tx, args);
  },

  async overShape(
    tx: WriteTransaction,
    args: { clientID: string; shapeID: string }
  ) {
    await overShape(tx, args);
  },

  async selectShape(
    tx: WriteTransaction,
    args: { clientID: string; shapeID: string }
  ) {
    await selectShape(tx, args);
  },

  async deleteAllShapes(tx: WriteTransaction) {
    await Promise.all(
      (
        await tx.scan({ prefix: shapePrefix }).keys().toArray()
      ).map((k) => tx.del(k))
    );
  },

  async initShapes(
    tx: WriteTransaction,
    shapes: { id: string; shape: Shape }[]
  ) {
    await initShapes(tx, shapes);
  },
};
