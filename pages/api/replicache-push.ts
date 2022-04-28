import { transact } from "../../backend/pg";
import {
  createDatabase,
  getLastMutationID,
  getVersion,
  initSpace,
  setLastMutationID,
  setVersion,
} from "../../backend/data";
import type { NextApiRequest, NextApiResponse } from "next";
import { ReplicacheTransaction } from "../../backend/replicache-transaction";
import { mutators } from "../../frontend/mutators";
import { z } from "zod";
import { jsonSchema } from "../../util/json";
import { assertNotUndefined } from "../../util/asserts";
import { getReactSampleData } from "../../backend/sample-issues";
import type { MutatorDefs } from "replicache";

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
  await transact(async (executor) => {
    await createDatabase(executor);
    await initSpace(executor, spaceID, getReactSampleData);

    const prevVersion = await getVersion(executor, spaceID);
    assertNotUndefined(prevVersion);
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

    await Promise.all([
      setLastMutationID(executor, push.clientID, lastMutationID),
      setVersion(executor, spaceID, nextVersion),
      tx.flush(),
    ]);
  });

  console.log("Processed all mutations in", Date.now() - t0);

  res.status(200).json({});
};

export default push;
