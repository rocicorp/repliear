import { transact } from "../../backend/pg";
import {
  createDatabase,
  getLastMutationID,
  getVersion,
  setLastMutationID,
  setVersion,
} from "../../backend/data";
import type { NextApiRequest, NextApiResponse } from "next";
import { ReplicacheTransaction } from "../../backend/replicache-transaction";
import { getSyncOrder } from "../../backend/sync-order";
import { mutators } from "../../frontend/mutators";
import { z } from "zod";
import { jsonSchema } from "../../util/json";
import type { MutatorDefs } from "replicache";
import Pusher from "pusher";

// TODO: Either generate schema from mutator types, or vice versa, to tighten this.
// See notes in bug: https://github.com/rocicorp/replidraw/issues/47
const mutationSchema = z.object({
  id: z.number(),
  name: z.string(),
  args: jsonSchema,
});

const pushRequestSchema = z.object({
  clientID: z.string(),
  mutations: z.array(mutationSchema),
});

const push = async (req: NextApiRequest, res: NextApiResponse) => {
  console.log("Processing push", JSON.stringify(req.body, null, ""));

  const spaceID = req.query["spaceID"].toString();
  const push = pushRequestSchema.parse(req.body);

  const t0 = Date.now();
  const result = await transact(async (executor) => {
    await createDatabase(executor);

    const prevVersion = await getVersion(executor, spaceID);
    if (prevVersion === undefined) {
      return undefined;
    }
    const nextVersion = prevVersion + 1;
    let lastMutationID =
      (await getLastMutationID(executor, push.clientID)) ?? 0;

    console.log("prevVersion: ", prevVersion);
    console.log("lastMutationID:", lastMutationID);

    const tx = new ReplicacheTransaction(
      executor,
      spaceID,
      push.clientID,
      nextVersion,
      getSyncOrder
    );

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
      const mutator = (mutators as MutatorDefs)[mutation.name];
      if (!mutator) {
        console.error(`Unknown mutator: ${mutation.name} - skipping`);
        continue;
      }

      try {
        await mutator(tx, mutation.args);
      } catch (e) {
        console.error(
          `Error executing mutator: ${JSON.stringify(mutator)}: ${e}`
        );
      }

      lastMutationID = expectedMutationID;
      console.log("Processed mutation in", Date.now() - t1);
    }

    return await Promise.all([
      setLastMutationID(executor, push.clientID, lastMutationID),
      setVersion(executor, spaceID, nextVersion),
      tx.flush(),
    ]);
  });

  if (!result) {
    res.status(404);
    res.end();
    return;
  }

  const startPoke = Date.now();
  if (
    process.env.NEXT_PUBLIC_PUSHER_APP_ID &&
    process.env.NEXT_PUBLIC_PUSHER_KEY &&
    process.env.NEXT_PUBLIC_PUSHER_SECRET &&
    process.env.NEXT_PUBLIC_PUSHER_CLUSTER
  ) {
    console.log("Processed all mutations in", Date.now() - t0);

    const pusher = new Pusher({
      appId: process.env.NEXT_PUBLIC_PUSHER_APP_ID,
      key: process.env.NEXT_PUBLIC_PUSHER_KEY,
      secret: process.env.NEXT_PUBLIC_PUSHER_SECRET,
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
      useTLS: true,
    });

    await pusher.trigger("default", "poke", {});
    console.log("Poke took", Date.now() - startPoke);
  } else {
    console.log("Not poking because Pusher is not configured");
  }
  res.status(200).json({});
};

export default push;
