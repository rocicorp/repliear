/**
 * This module provides implements mutators abstracted over underlying storage,
 * which is either RDS (on server) or Replicache (on client).
 *
 * This way we can use the same mutator implementations on client-side and
 * server-side.
 */

import * as t from "io-ts";
import { shape, getShape, putShape } from "./shape";
import { getClientState, putClientState } from "./client-state";
import Storage from "./storage";

export async function createShape(
  storage: Storage,
  args: CreateShapeArgs
): Promise<void> {
  await putShape(storage, args.id, args.shape);
}
// TODO: Is there a way to make this a little less laborious?
export const createShapeArgs = t.type({
  id: t.string,
  shape: shape,
});
export type CreateShapeArgs = t.TypeOf<typeof createShapeArgs>;

export async function moveShape(
  storage: Storage,
  args: MoveShapeArgs
): Promise<void> {
  const shape = await getShape(storage, args.id);
  if (!shape) {
    console.log(`Specified shape ${args.id} not found.`);
    return;
  }
  shape.x += args.dx;
  shape.y += args.dy;
  await putShape(storage, args.id, shape);
}
export const moveShapeArgs = t.type({
  id: t.string,
  dx: t.number,
  dy: t.number,
});
export type MoveShapeArgs = t.TypeOf<typeof moveShapeArgs>;

export async function overShape(
  storage: Storage,
  args: OverShapeArgs
): Promise<void> {
  const client = await getClientState(storage, args.clientID);
  client.overID = args.shapeID;
  await putClientState(storage, args.clientID, client);
}
export const overShapeArgs = t.type({
  clientID: t.string,
  shapeID: t.string,
});
export type OverShapeArgs = t.TypeOf<typeof overShapeArgs>;
