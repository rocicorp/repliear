import type { NextApiRequest, NextApiResponse } from "next";
import { transact } from "../../backend/pg";
import {
  createDatabase,
  getChangedEntries,
  getCookie,
  getLastMutationID,
  initSpace,
} from "../../backend/data";
import { z } from "zod";
import type { PullResponse } from "replicache";
import { getReactIssues } from "../../backend/sample-issues";
import { getReactComments } from "backend/sample-comments";

const pullRequest = z.object({
  clientID: z.string(),
  cookie: z.union([z.number(), z.null()]),
});

const pull = async (req: NextApiRequest, res: NextApiResponse) => {
  console.log(`Processing pull`, JSON.stringify(req.body, null, ""));

  const spaceID = req.query["spaceID"].toString();
  const pull = pullRequest.parse(req.body);
  const requestCookie = pull.cookie;

  console.log("spaceID", spaceID);
  console.log("clientID", pull.clientID);

  const t0 = Date.now();

  const [entries, lastMutationID, responseCookie] = await transact(
    async (executor) => {
      await createDatabase(executor);
      await initSpace(executor, spaceID, getReactIssues, getReactComments);

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

  for (const [key, value, deleted] of entries) {
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

  console.log("issues size", JSON.stringify(await getReactIssues()).length);
  console.log("Pull response size", JSON.stringify(resp).length);
  res.json(resp);
  res.end();
};

export default pull;
