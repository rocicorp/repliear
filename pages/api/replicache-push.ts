import * as t from "io-ts";
import { ExecuteStatementFn, transact } from "../../backend/rds";
import {
  MutatorStorage,
  createShape,
  createShapeArgs,
  moveShape,
  moveShapeArgs,
  MoveShapeArgs,
  overShape,
  overShapeArgs,
} from "../../shared/mutators";
import {
  getClientState,
  getLastMutationID,
  getShape,
  putClientState,
  putShape,
  setLastMutationID,
} from "../../backend/data";
import { must } from "../../backend/decode";
import Pusher from "pusher";
import type { NextApiRequest, NextApiResponse } from "next";

const mutation = t.union([
  t.type({
    id: t.number,
    name: t.literal("createShape"),
    args: createShapeArgs,
  }),
  t.type({
    id: t.number,
    name: t.literal("moveShape"),
    args: moveShapeArgs,
  }),
  t.type({
    id: t.number,
    name: t.literal("overShape"),
    args: overShapeArgs,
  }),
]);

const pushRequest = t.type({
  clientID: t.string,
  mutations: t.array(mutation),
});

type Mutation = t.TypeOf<typeof mutation>;

export default async (req: NextApiRequest, res: NextApiResponse) => {
  const push = must(pushRequest.decode(req.body));

  for (let i = 0; i < push.mutations.length; i++) {
    await transact(async (executor) => {
      console.log("Processing mutation", mutation);

      let lastMutationID = await getLastMutationID(executor, push.clientID);
      console.log("lastMutationID:", lastMutationID);

      // Scan forward from here collapsing any collapsable mutations.
      for (let mutation: Mutation; (mutation = push.mutations[i]); i++) {
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

        const ms = mutatorStorage(executor);

        switch (mutation.name) {
          case "moveShape":
            await moveShape(ms, mutation.args);
            break;
          case "createShape":
            await createShape(ms, must(createShapeArgs.decode(mutation.args)));
            break;
          case "overShape":
            await overShape(ms, must(overShapeArgs.decode(mutation.args)));
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
  if (prev.name == "moveShape" && next.name == "moveShape") {
    next.args.dx += prev.args.dx;
    next.args.dy += prev.args.dy;
    return true;
  }
  return false;
}

function mutatorStorage(executor: ExecuteStatementFn): MutatorStorage {
  return {
    getShape: getShape.bind(null, executor),
    putShape: putShape.bind(null, executor),
    getClientState: getClientState.bind(null, executor),
    putClientState: putClientState.bind(null, executor),
  };
}
