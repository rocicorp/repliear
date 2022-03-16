import type { NextApiRequest, NextApiResponse } from "next";
import { transact } from "../../backend/pg";
import {
  createDatabase,
  getChangedEntries,
  getCookie,
  getLastMutationID,
} from "../../backend/data";
import { z } from "zod";
import { PullResponse } from "replicache";

const pullRequest = z.object({
  clientID: z.string(),
  cookie: z.union([z.number(), z.null()]),
});

export default async (req: NextApiRequest, res: NextApiResponse) => {
  console.log(`Processing pull`, JSON.stringify(req.body, null, ""));

  const spaceID = req.query["spaceID"].toString();
  const pull = pullRequest.parse(req.body);
  let requestCookie = pull.cookie;

  console.log("spaceID", spaceID);
  console.log("clientID", pull.clientID);

  const t0 = Date.now();

  const [entries, lastMutationID, responseCookie] = await transact(
    async (executor) => {
      await createDatabase(executor);

      return Promise.all([
        getChangedEntries(executor, spaceID, requestCookie ?? 0),
        getLastMutationID(executor, pull.clientID),
        getCookie(executor, spaceID),
      ]);
    }
  );

  console.log("lastMutationID: ", lastMutationID);
  console.log("responseCookie: ", responseCookie);
  console.log("Read all objects in", Date.now() - t0);

  const resp: PullResponse = {
    lastMutationID: lastMutationID ?? 0,
    cookie: responseCookie ?? 0,
    patch: [],
  };

  for (let [key, value, deleted] of entries) {
    if (deleted) {
      resp.patch.push({
        op: "del",
        key,
      });
    } else {
      resp.patch.push({
        op: "put",
        key,
        value,
      });
    }
  }

  console.log(`Returning`, JSON.stringify(resp, null, ""));
  res.json(resp);
  res.end();
};
