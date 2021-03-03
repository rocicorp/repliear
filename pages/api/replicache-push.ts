import * as t from "io-ts";
import { ExecuteStatementFn, transact } from "../../backend/rds";
import { putShape, moveShape, shape } from "../../shared/shape";
import {
  initClientState,
  overShape,
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
  console.log("Processing push", push);

  for (let i = 0; i < push.mutations.length; i++) {
    await transact(async (executor) => {
      let lastMutationID = await getLastMutationID(executor, push.clientID);
      console.log({ lastMutationID });

      // Scan forward from here collapsing any collapsable mutations.
      for (; i < push.mutations.length; i++) {
        let mutation = push.mutations[i];
        console.log({ mutation });

        const expectedMutationID = lastMutationID + 1;
        if (mutation.id < expectedMutationID) {
          console.log(
            "This mutation has already been processed. Nothing to do."
          );
          return;
        }
        if (mutation.id > expectedMutationID) {
          console.log(
            "This mutation is from the future. Nothing to do but wait."
          );
          return;
        }

        const next = push.mutations[i + 1];
        console.log("Considering for collapse", mutation, next);
        if (next) {
          if (collapse(mutation, next)) {
            lastMutationID = mutation.id;
            console.log("Collapsed into", next);
            continue;
          }
        }

        const s = storage(executor);

        switch (mutation.name) {
          case "moveShape":
            await moveShape(s, mutation.args);
            break;
          case "createShape":
            await putShape(s, mutation.args);
            break;
          case "overShape":
            await overShape(s, mutation.args);
            break;
          case "initClientState":
            await initClientState(s, mutation.args);
            break;
        }

        await setLastMutationID(executor, push.clientID, expectedMutationID);

        break;
      }
    });
  }

  const pusher = new Pusher({
    appId: "1157097",
    key: "d9088b47d2371d532c4c",
    secret: "64204dab73c42e17afc3",
    cluster: "us3",
    useTLS: true,
  });
  console.time(`sending poke...`);
  await pusher.trigger("default", "poke", {});
  console.timeEnd(`sending poke...`);

  res.status(200).json({});
};

// If prev and next are collapsible, collapse them by mutating next.
function collapse(prev: Mutation, next: Mutation): boolean {
  if (prev.name === "moveShape" && next.name === "moveShape") {
    next.args.dx += prev.args.dx;
    next.args.dy += prev.args.dy;
    return true;
  }
  return false;
}

function storage(executor: ExecuteStatementFn): Storage {
  return {
    getObject: getObject.bind(null, executor),
    putObject: putObject.bind(null, executor),
  };
}
