import * as t from "io-ts";

export const shape = t.type({
  type: t.string,
  x: t.number,
  y: t.number,
  width: t.number,
  height: t.number,
  rotate: t.number,
  strokeWidth: t.number,
  fill: t.string,
  radius: t.number,
  blendMode: t.string,
});

export type Shape = t.TypeOf<typeof shape>;
