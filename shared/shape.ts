import * as t from "io-ts";
import { must } from "../backend/decode";
import { ReadStorage, WriteStorage } from "./storage";

export const shape = t.type({
  type: t.literal("rect"),
  x: t.number,
  y: t.number,
  width: t.number,
  height: t.number,
  rotate: t.number,
  fill: t.string,
});

export type Shape = t.TypeOf<typeof shape>;

export async function getShape(
  storage: ReadStorage,
  id: string
): Promise<Shape | null> {
  const jv = await storage.getObject(key(id));
  if (!jv) {
    console.log(`Specified shape ${id} not found.`);
    return null;
  }
  return must(shape.decode(jv));
}

export function putShape(
  storage: WriteStorage,
  { id, shape }: { id: string; shape: Shape }
): Promise<void> {
  return storage.putObject(key(id), shape);
}

export function deleteShape(storage: WriteStorage, id: string): Promise<void> {
  return storage.delObject(key(id));
}

export async function moveShape(
  storage: WriteStorage,
  { id, dx, dy }: { id: string; dx: number; dy: number }
): Promise<void> {
  const shape = await getShape(storage, id);
  if (shape) {
    shape.x += dx;
    shape.y += dy;
    await putShape(storage, { id, shape });
  }
}

export async function resizeShape(
  storage: WriteStorage,
  { id, ds }: { id: string; ds: number }
): Promise<void> {
  const shape = await getShape(storage, id);
  if (shape) {
    const minSize = 10;
    const dw = Math.max(minSize - shape.width, ds);
    const dh = Math.max(minSize - shape.height, ds);
    shape.width += dw;
    shape.height += dh;
    shape.x -= dw / 2;
    shape.y -= dh / 2;
    await putShape(storage, { id, shape });
  }
}

export async function rotateShape(
  storage: WriteStorage,
  { id, ddeg }: { id: string; ddeg: number }
): Promise<void> {
  const shape = await getShape(storage, id);
  if (shape) {
    shape.rotate += ddeg;
    await putShape(storage, { id, shape });
  }
}

function key(id: string): string {
  return `shape-${id}`;
}
