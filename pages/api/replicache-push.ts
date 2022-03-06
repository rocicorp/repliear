/*
import * as t from "io-ts";
import { transact } from "../../backend/rds";
import { getLastMutationID, setLastMutationID } from "../../backend/data";
import Pusher from "pusher";
import type { NextApiRequest, NextApiResponse } from "next";
import { WriteTransactionImpl } from "../../backend/write-transaction-impl";
import { mutators } from "../../frontend/mutators";
import { must } from "../../frontend/decode";

// TODO: Either generate schema from mutator types, or vice versa, to tighten this.
// See notes in bug: https://github.com/rocicorp/replidraw/issues/47
const mutation = t.type({
  id: t.number,
  name: t.string,
  args: t.any,
});

const pushRequest = t.type({
  clientID: t.string,
  mutations: t.array(mutation),
});

export default async (req: NextApiRequest, res: NextApiResponse) => {
  console.log("Processing push", JSON.stringify(req.body, null, ""));

  const docID = req.query["docID"].toString();
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
    const tx = new WriteTransactionImpl(executor, docID);

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
      const mutator = (mutators as any)[mutation.name];
      if (!mutator) {
        console.error(`Unknown mutator: ${mutation.name} - skipping`);
      }

      try {
        await mutator(tx, mutation.args);
      } catch (e) {
        console.error(
          `Error executing mutator: ${JSON.stringify(mutator)}: ${e.message}`
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
*/
