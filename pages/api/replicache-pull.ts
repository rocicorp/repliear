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
import {
  PARTIAL_SYNC_STATE_KEY,
  PartialSyncState,
  partialSyncStateSchema,
} from "frontend/control";

const cookieSchema = z.union([
  z.object({ version: z.number(), partialSync: partialSyncStateSchema }),
  z.null(),
]);

type Cookie = z.TypeOf<typeof cookieSchema>;

const pullRequestSchema = z.object({
  clientID: z.string(),
  cookie: cookieSchema,
});

const pull = async (req: NextApiRequest, res: NextApiResponse) => {
  const startPull = Date.now();
  console.log(`Processing pull`, JSON.stringify(req.body, null, ""));
  const spaceID = req.query["spaceID"].toString();
  const startRequestParse = Date.now();
  const pull = pullRequestSchema.parse(req.body);
  console.log("Request parse took", Date.now() - startRequestParse);
  const requestCookie: Cookie = pull.cookie;

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
      const lastMutationIDPromise = await getLastMutationID(
        executor,
        pull.clientID
      );
      const entries = await getIssueEntries(executor, spaceID);
      const responsePartialSyncState: PartialSyncState = "ISSUES_SYNCED";
      const responseCookie: Cookie = {
        version,
        partialSync: responsePartialSyncState,
      };
      entries.push([
        PARTIAL_SYNC_STATE_KEY,
        JSON.stringify(responsePartialSyncState),
      ]);
      return Promise.all([entries, lastMutationIDPromise, responseCookie]);
    } else {
      const lastMutationIDPromise = getLastMutationID(executor, pull.clientID);
      let entries: [
        key: string,
        value: string,
        deleted?: boolean
      ][] = await getChangedEntries(executor, spaceID, requestCookie.version);
      let responsePartialSyncState: PartialSyncState = "PARTIAL_SYNC_COMPLETE";
      if (requestCookie.partialSync !== "PARTIAL_SYNC_COMPLETE") {
        const limit = 3000;
        const startKey =
          requestCookie.partialSync === "ISSUES_SYNCED"
            ? ""
            : requestCookie.partialSync.endKey;
        const {
          entries: incrementalEntries,
          endSyncOrder,
        } = await getNonIssueEntriesInSyncOrder(
          executor,
          spaceID,
          startKey,
          limit
        );
        const startMergeEntries = Date.now();
        entries = [...entries, ...incrementalEntries];
        console.log("merge entries took", Date.now() - startMergeEntries);
        const partialSyncDone =
          incrementalEntries.length < limit || endSyncOrder === undefined;
        if (!partialSyncDone) {
          responsePartialSyncState = {
            endKey: endSyncOrder,
          };
        }
        entries.push([
          PARTIAL_SYNC_STATE_KEY,
          JSON.stringify(responsePartialSyncState),
        ]);
      }
      const responseCookie: Cookie = {
        version,
        partialSync: responsePartialSyncState,
      };
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
  const resp = `{
    "lastMutationID": ${lastMutationID ?? 0},
    "cookie": ${JSON.stringify(responseCookie) ?? 0},
    "patch": [${entries
      .map(([key, value, deleted]) => {
        if (deleted) {
          return `{
            "op": "del",
            "key": "${key}"
          }`;
        } else {
          return `{
            "op": "put",
            "key": "${key}",
            "value": ${value}
          }`;
        }
      })
      .join(",")}]
  }`;
  console.log("Building patch took", Date.now() - startBuildingPatch);

  const startSend = Date.now();
  res.setHeader("Content-Type", "application/json");
  res.send(resp);
  console.log("res.send took", Date.now() - startSend);

  const startEnd = Date.now();
  res.end();
  console.log("res.end took", Date.now() - startEnd);

  console.log("Pull took", Date.now() - startPull);
};

export default pull;
