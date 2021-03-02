import * as t from "io-ts";

export const clientState = t.type({
  overID: t.string,
});

export type ClientState = t.TypeOf<typeof clientState>;
