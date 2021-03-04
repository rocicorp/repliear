import * as t from "io-ts";
import { ExecuteStatementFn, transact } from "../../backend/rds";
import { putShape, moveShape, shape } from "../../shared/shape";
import {
  initClientState,
  overShape,
  setCursor,
  userInfo,
} from "../../shared/client-state";
import {
  getObject,
  putObject,
  getLastMutationID,
  setLastMutationID,
} from "../../backend/data";
import type Storage from "../../shared/storage";
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
    name: t.literal("moveShape"),
    args: t.type({
      id: t.string,
      dx: t.number,
      dy: t.number,
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
]);

const pushRequest = t.type({
  clientID: t.string,
  mutations: t.array(mutation),
});

type Mutation = t.TypeOf<typeof mutation>;

export default async (req: NextApiRequest, res: NextApiResponse) => {
  const push = must(pushRequest.decode(req.body));
  console.log("Processing push", JSON.stringify(push, null, ""));

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
        case "moveShape":
          await moveShape(s, mutation.args);
          break;
        case "createShape":
          await putShape(s, mutation.args);
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
  const cache: { [key: string]: { value: JSONValue; dirty: boolean } } = {};
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
    flush: async () => {
      await Promise.all(
        Object.entries(cache)
          .filter(([, { dirty }]) => dirty)
          .map(([k, { value }]) => putObject(executor, k, value))
      );
    },
  };
}
