import type { NextApiRequest, NextApiResponse } from "next";
import { transact } from "../../backend/pg";
import {
  createDatabase,
  getChangedEntries,
  getIssueEntries,
  getLastMutationID,
  getNonIssueEntriesInSyncOrder,
  getVersion,
} from "../../backend/data";
import { z } from "zod";
import type { JSONValue, PullResponse } from "replicache";

const pullRequest = z.object({
  clientID: z.string(),
  cookie: z.union([
    z.object({ version: z.number(), endKey: z.string().optional() }),
    z.null(),
  ]),
});

const pull = async (req: NextApiRequest, res: NextApiResponse) => {
  const startPull = Date.now();
  console.log(`Processing pull`, JSON.stringify(req.body, null, ""));
  const spaceID = req.query["spaceID"].toString();
  const startRequestParse = Date.now();
  const pull = pullRequest.parse(req.body);
  console.log("Request parse took", Date.now() - startRequestParse);
  const requestCookie = pull.cookie;

  console.log("spaceID", spaceID);
  console.log("clientID", pull.clientID);

  const startTransact = Date.now();
  const result = await transact(async (executor) => {
    await createDatabase(executor);
    const version = await getVersion(executor, spaceID);
    if (version === undefined) {
      return undefined;
    }
    if (!requestCookie) {
      const lastMutationIDPromise = getLastMutationID(executor, pull.clientID);
      const entriesPromise = await getIssueEntries(executor, spaceID);
      const responseCookie = { version, endKey: "" };
      return Promise.all([
        entriesPromise,
        lastMutationIDPromise,
        responseCookie,
      ]);
    } else {
      const lastMutationIDPromise = getLastMutationID(executor, pull.clientID);
      let entries: [
        key: string,
        value: JSONValue,
        deleted?: boolean
      ][] = await getChangedEntries(executor, spaceID, requestCookie.version);
      let responseEndKey = undefined;
      if (requestCookie.endKey !== undefined) {
        const limit = 3000;
        const {
          entries: incrementalEntries,
          endSyncOrder,
        } = await getNonIssueEntriesInSyncOrder(
          executor,
          spaceID,
          requestCookie.endKey,
          limit
        );
        const startMergeEntries = Date.now();
        entries = [...entries, ...incrementalEntries];
        console.log("merge entries took", Date.now() - startMergeEntries);
        const initialSyncDone = incrementalEntries.length < limit;
        if (initialSyncDone) {
          responseEndKey = undefined;
        } else {
          responseEndKey = endSyncOrder;
        }
        entries.push([
          "control/partialSync",
          {
            endKey: responseEndKey,
          },
        ]);
      }
      const responseCookie = { version, endKey: responseEndKey };
      return Promise.all([entries, lastMutationIDPromise, responseCookie]);
    }
  });
  console.log("transact took", Date.now() - startTransact);

  if (!result) {
    res.status(404);
    res.end();
    return;
  }
  const startBuildingPatch = Date.now();
  const [entries, lastMutationID, responseCookie] = result;

  console.log("lastMutationID: ", lastMutationID);
  console.log("responseCookie: ", responseCookie);
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
  console.log("Building patch took", Date.now() - startBuildingPatch);

  const startJson = Date.now();
  res.json(resp);
  console.log("res.json took", Date.now() - startJson);

  const startEnd = Date.now();
  res.end();
  console.log("res.end took", Date.now() - startEnd);

  console.log("Pull took", Date.now() - startPull);
};

export default pull;
