/**
 * This module provides implements mutators abstracted over underlying storage,
 * which is either RDS (on server) or Replicache (on client).
 * 
 * This way we can use the same mutator implementations on client-side and
 * server-side.
 */

import * as t from 'io-ts';
import {shape} from './shape';
import type {Shape} from './shape';

/**
 * Interface required of underlying storage.
 */
export interface MutatorStorage {
  getShape(id: string): Promise<Shape|null>;
  putShape(id: string, shape: Shape): Promise<void>;
}

export async function createShape(storage: MutatorStorage, args: CreateShapeArgs): Promise<void> {
  await storage.putShape(args.id, args.shape);
}
// TODO: Is there a way to make this a little less laborious?
export const createShapeArgs = t.type({
  id: t.string,
  shape: shape,
});
export type CreateShapeArgs = t.TypeOf<typeof createShapeArgs>;

export async function moveShape(storage: MutatorStorage, args: MoveShapeArgs): Promise<void> {
  const shape = await storage.getShape(args.id);
  if (!shape) {
    console.log(`Specified shape ${args.id} not found.`);
    return;
  }
  shape.x += args.dx;
  shape.y += args.dy;
  await storage.putShape(args.id, shape);
}
export const moveShapeArgs = t.type({
  id: t.string,
  dx: t.number,
  dy: t.number,
});
export type MoveShapeArgs = t.TypeOf<typeof moveShapeArgs>;
