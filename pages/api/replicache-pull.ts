import * as t from "io-ts";
import type { NextApiRequest, NextApiResponse } from "next";
import { ExecuteStatementCommandOutput, Field } from "@aws-sdk/client-rds-data";
import { transact } from "../../backend/rds";
import { getCookieVersion, getLastMutationID } from "../../backend/data";
import { must } from "../../backend/decode";

export default async (req: NextApiRequest, res: NextApiResponse) => {
  console.log(`Processing pull`, JSON.stringify(req.body, null, ""));

  const pull = must(pullRequest.decode(req.body));
  let cookie = pull.cookie ?? 0;

  const t0 = Date.now();
  let entries;
  let lastMutationID = 0;

  await transact(async (executor) => {
    [entries, lastMutationID, cookie] = await Promise.all([
      executor("SELECT K, V, Deleted FROM Object WHERE Version > :version", {
        version: { longValue: cookie },
      }),
      getLastMutationID(executor, pull.clientID),
      getCookieVersion(executor),
    ]);
  });
  console.log("lastMutationID: ", lastMutationID);
  console.log("Read all objects in", Date.now() - t0);

  // Grump. Typescript seems to not understand that the argument to transact()
  // is guaranteed to have been called before transact() exits.
  entries = (entries as any) as ExecuteStatementCommandOutput;

  const resp: PullResponse = {
    lastMutationID,
    cookie,
    patch: [],
    // TODO: Remove this as soon as Replicache stops requiring it.
    httpRequestInfo: {
      httpStatusCode: 200,
      errorMessage: "",
    },
  };

  if (entries.records) {
    for (let row of entries.records) {
      const [
        { stringValue: key },
        { stringValue: content },
        { booleanValue: deleted },
      ] = row as [
        Field.StringValueMember,
        Field.StringValueMember,
        Field.BooleanValueMember
      ];
      if (deleted) {
        resp.patch.push({
          op: "del",
          key,
        });
      } else {
        resp.patch.push({
          op: "put",
          key,
          value: JSON.parse(content),
        });
      }
    }
  }

  console.log(`Returning`, JSON.stringify(resp, null, ""));
  res.json(resp);
  res.end();
};

const pullRequest = t.type({
  clientID: t.string,
  cookie: t.union([t.number, t.null]),
});

const pullResponse = t.type({
  cookie: t.number,
  lastMutationID: t.number,
  patch: t.array(
    t.union([
      t.type({
        op: t.literal("put"),
        key: t.string,
        value: t.any,  // TODO: Define a JSON type?
      }),
      t.type({
        op: t.literal("del"),
        key: t.string,
      }),
    ])
  ),
  // unused - will go away
  httpRequestInfo: t.type({
    httpStatusCode: t.number,
    errorMessage: t.literal(""),
  }),
});
type PullResponse = t.TypeOf<typeof pullResponse>;
