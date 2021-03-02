import * as t from "io-ts";
import type { NextApiRequest, NextApiResponse } from "next";
import { ExecuteStatementCommandOutput, Field } from "@aws-sdk/client-rds-data";
import { transact } from "../../backend/rds";
import { getCookieVersion, getLastMutationID } from "../../backend/data";
import { must } from "../../backend/decode";

export default async (req: NextApiRequest, res: NextApiResponse) => {
  console.log(`Processing pull`, req.body);

  const pull = must(pullRequest.decode(req.body));
  let cookie = pull.baseStateID === "" ? 0 : parseInt(pull.baseStateID);

  console.time(`Reading all objects...`);
  let entries;
  let lastMutationID = 0;

  await transact(async (executor) => {
    [entries, lastMutationID, cookie] = await Promise.all([
      executor("SELECT * FROM Object WHERE Version > :version", {
        version: { longValue: cookie },
      }),
      getLastMutationID(executor, pull.clientID),
      getCookieVersion(executor),
    ]);
  });
  console.log({ lastMutationID });
  console.timeEnd(`Reading all objects...`);

  // Grump. Typescript seems to not understand that the argument to transact()
  // is guaranteed to have been called before transact() exits.
  entries = (entries as any) as ExecuteStatementCommandOutput;

  const resp: PullResponse = {
    lastMutationID,
    stateID: String(cookie),
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
          op: "remove",
          path: `/${key}`,
        });
      } else {
        resp.patch.push({
          op: "replace",
          path: `/${key}`,
          valueString: content,
        });
      }
    }
  }

  console.log(`Returning`, resp);
  res.json(resp);
  res.end();
};

const pullRequest = t.type({
  clientID: t.string,
  baseStateID: t.string,
});

const pullResponse = t.type({
  stateID: t.string,
  lastMutationID: t.number,
  patch: t.array(
    t.union([
      t.type({
        op: t.literal("replace"),
        path: t.string,
        // TODO: This will change to be arbitrary JSON
        valueString: t.string,
      }),
      t.type({
        op: t.literal("add"),
        path: t.string,
        valueString: t.string,
      }),
      t.type({
        op: t.literal("remove"),
        path: t.string,
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
