import { transact } from "../../backend/pg";
import {
  getCookie,
  getLastMutationID,
  setLastMutationID,
} from "../../backend/data";
import Pusher from "pusher";
import type { NextApiRequest, NextApiResponse } from "next";
import { ReplicacheTransaction } from "../../backend/replicache-transaction";
import { mutators } from "../../frontend/mutators";
import { z } from "zod";
import { jsonSchema } from "../../util/json";

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

export default async (req: NextApiRequest, res: NextApiResponse) => {
  console.log("Processing push", JSON.stringify(req.body, null, ""));

  const spaceID = req.query["spaceID"].toString();
  const push = pushRequestSchema.parse(req.body);

  const t0 = Date.now();
  await transact(async (executor) => {
    const prevVersion = (await getCookie(executor, spaceID)) ?? 0;
    const nextVersion = prevVersion + 1;
    let lastMutationID =
      (await getLastMutationID(executor, push.clientID)) ?? 0;

    console.log("prevVersion: ", prevVersion);
    console.log("lastMutationID:", lastMutationID);

    const tx = new ReplicacheTransaction(
      executor,
      spaceID,
      push.clientID,
      nextVersion
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
      const mutator = (mutators as any)[mutation.name];
      if (!mutator) {
        console.error(`Unknown mutator: ${mutation.name} - skipping`);
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

    await Promise.all([
      setLastMutationID(executor, push.clientID, lastMutationID),
      tx.flush(),
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
  // We need to await here otherwise, Next.js will frequently kill the request
  // and the poke won't get sent.
  await pusher.trigger("default", "poke", {});
  console.log("Sent poke in", Date.now() - t2);

  res.status(200).json({});
};
