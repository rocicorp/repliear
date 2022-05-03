import type { NextApiRequest, NextApiResponse } from "next";
import { transact } from "../../backend/pg";
import {
  createDatabase,
  getChangedEntries,
  getIssueEntries,
  getLastMutationID,
  getNonIssueEntries,
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
  console.log(`Processing pull`, JSON.stringify(req.body, null, ""));

  const spaceID = req.query["spaceID"].toString();
  const pull = pullRequest.parse(req.body);
  const requestCookie = pull.cookie;

  console.log("spaceID", spaceID);
  console.log("clientID", pull.clientID);

  const t0 = Date.now();

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
        const incrementalEntries = await getNonIssueEntries(
          executor,
          spaceID,
          requestCookie.endKey,
          limit
        );
        entries = [...entries, ...incrementalEntries];
        const initialSyncDone = incrementalEntries.length < limit;
        if (initialSyncDone) {
          responseEndKey = undefined;
        } else {
          responseEndKey = incrementalEntries[incrementalEntries.length - 1][0];
        }
        entries.push([
          "control/partialSync",
          {
            endKey: responseEndKey,
          },
        ]);
      }
      const version = await getVersion(executor, spaceID);
      const responseCookie = { version, endKey: responseEndKey };
      return Promise.all([entries, lastMutationIDPromise, responseCookie]);
    }
  });

  if (!result) {
    res.status(404);
    res.end();
    return;
  }

  const [entries, lastMutationID, responseCookie] = result;

  console.log("lastMutationID: ", lastMutationID);
  console.log("responseCookie: ", responseCookie);
  console.log("Read all objects in", Date.now() - t0);

  const start = Date.now();
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
  console.log("Built patch in", Date.now() - start);

  res.json(resp);
  res.end();
};

export default pull;
