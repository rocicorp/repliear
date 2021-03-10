import * as t from "io-ts";
import { ExecuteStatementFn, transact } from "../../backend/rds";
import {
  putShape,
  moveShape,
  resizeShape,
  rotateShape,
  shape,
  deleteShape,
} from "../../shared/shape";
import {
  initClientState,
  overShape,
  selectShape,
  setCursor,
  userInfo,
} from "../../shared/client-state";
import {
  getObject,
  putObject,
  delObject,
  getLastMutationID,
  setLastMutationID,
} from "../../backend/data";
import { must } from "../../backend/decode";
import Pusher from "pusher";
import type { NextApiRequest, NextApiResponse } from "next";
import { JSONValue } from "replicache";

const mutation = t.union([
  t.type({
    id: t.number,
    name: t.literal("createShape"),
    args: t.type({
      id: t.string,
      shape,
    }),
  }),
  t.type({
    id: t.number,
    name: t.literal("deleteShape"),
    args: t.string,
  }),
  t.type({
    id: t.number,
    name: t.literal("moveShape"),
    args: t.type({
      id: t.string,
      dx: t.number,
      dy: t.number,
    }),
  }),
  t.type({
    id: t.number,
    name: t.literal("resizeShape"),
    args: t.type({
      id: t.string,
      ds: t.number,
    }),
  }),
  t.type({
    id: t.number,
    name: t.literal("rotateShape"),
    args: t.type({
      id: t.string,
      ddeg: t.number,
    }),
  }),
  t.type({
    id: t.number,
    name: t.literal("initClientState"),
    args: t.type({
      id: t.string,
      defaultUserInfo: userInfo,
    }),
  }),
  t.type({
    id: t.number,
    name: t.literal("setCursor"),
    args: t.type({
      id: t.string,
      x: t.number,
      y: t.number,
    }),
  }),
  t.type({
    id: t.number,
    name: t.literal("overShape"),
    args: t.type({
      clientID: t.string,
      shapeID: t.string,
    }),
  }),
  t.type({
    id: t.number,
    name: t.literal("selectShape"),
    args: t.type({
      clientID: t.string,
      shapeID: t.string,
    }),
  }),
]);

const pushRequest = t.type({
  clientID: t.string,
  mutations: t.array(mutation),
});

type Mutation = t.TypeOf<typeof mutation>;

export default async (req: NextApiRequest, res: NextApiResponse) => {
  console.log("Processing push", JSON.stringify(req.body, null, ""));
  const push = must(pushRequest.decode(req.body));

  // Because we are implementing multiplayer, our pushes will tend to have
  // *lots* of very fine-grained events. Think, for example, of mouse moves.
  //
  // I hear you saying, dear reader: "It's silly to send and process all these
  // little teeny movemove events. Why not collapse consecutive runs of the
  // same mutation type either on client before sending, or server before
  // processing.
  //
  // We could do that, but there are cases that are more complicated. Consider
  // drags for example: when a user drags an object, the mutations we get are
  // like: moveCursor,moveShape,moveCursor,moveShape,etc.
  //
  // It's less clear how to collapse sequences like this. In the specific case
  // of moveCursor/moveShape, you could come up with something that make sense,
  // but generally Replicache mutations are arbitrary functions of the data
  // at a moment in time. We can't re-order or collapse them and get a correct
  // result without re-running them.
  //
  // Instead, we take a different tack:
  // * We send all the mutations, faithfully, from the client (and rely on gzip
  //   to compress it).
  // * We open a single, exclusive transaction against MySQL to process all
  //   mutations in a push.
  // * We heavily cache (in memory) within that transaction so that we don't
  //   have to go all the way back to MySQL for each tiny mutation.
  // * We flush all the mutations to MySQL in parallel at the end.
  //
  // As a nice bonus this means that (a) we don't have to have any special-case
  // collapse logic anywhere, and (b) we get a nice perf boost by parallelizing
  // the flush at the end.

  const t0 = Date.now();
  await transact(async (executor) => {
    const s = storage(executor);

    let lastMutationID = await getLastMutationID(executor, push.clientID);
    console.log("lastMutationID:", lastMutationID);

    for (let i = 0; i < push.mutations.length; i++) {
      const mutation = push.mutations[i];
      const expectedMutationID = lastMutationID + 1;

      if (mutation.id < expectedMutationID) {
        console.log(
          `Mutation ${mutation.id} has already been processed - skipping`
        );
        continue;
      }
      if (mutation.id > expectedMutationID) {
        console.warn(`Mutation ${mutation.id} is from the future - aborting`);
        break;
      }

      console.log("Processing mutation:", JSON.stringify(mutation, null, ""));

      const t1 = Date.now();
      switch (mutation.name) {
        case "createShape":
          await putShape(s, mutation.args);
          break;
        case "deleteShape":
          await deleteShape(s, mutation.args);
          break;
        case "moveShape":
          await moveShape(s, mutation.args);
          break;
        case "resizeShape":
          await resizeShape(s, mutation.args);
          break;
        case "rotateShape":
          await rotateShape(s, mutation.args);
          break;
        case "initClientState":
          await initClientState(s, mutation.args);
          break;
        case "setCursor":
          await setCursor(s, mutation.args);
          break;
        case "overShape":
          await overShape(s, mutation.args);
          break;
        case "selectShape":
          await selectShape(s, mutation.args);
          break;
      }

      lastMutationID = expectedMutationID;
      console.log("Processed mutation in", Date.now() - t1);
    }

    await Promise.all([
      s.flush(),
      setLastMutationID(executor, push.clientID, lastMutationID),
    ]);
  });

  console.log("Processed all mutations in", Date.now() - t0);

  const pusher = new Pusher({
    appId: "1157097",
    key: "d9088b47d2371d532c4c",
    secret: "64204dab73c42e17afc3",
    cluster: "us3",
    useTLS: true,
  });

  const t2 = Date.now();
  await pusher.trigger("default", "poke", {});
  console.log("Sent poke in", Date.now() - t2);

  res.status(200).json({});
};

function storage(executor: ExecuteStatementFn) {
  // TODO: When we have the real mysql client, check whether it appears to do
  // this caching internally.
  const cache: {
    [key: string]: { value: JSONValue | undefined; dirty: boolean };
  } = {};
  return {
    getObject: async (key: string) => {
      const entry = cache[key];
      if (entry) {
        return entry.value;
      }
      const value = await getObject(executor, key);
      cache[key] = { value, dirty: false };
      return value;
    },
    putObject: async (key: string, value: JSONValue) => {
      cache[key] = { value, dirty: true };
    },
    delObject: async (key: string) => {
      cache[key] = { value: undefined, dirty: true };
    },
    flush: async () => {
      await Promise.all(
        Object.entries(cache)
          .filter(([, { dirty }]) => dirty)
          .map(([k, { value }]) => {
            if (value === undefined) {
              return delObject(executor, k);
            } else {
              return putObject(executor, k, value);
            }
          })
      );
    },
  };
}
