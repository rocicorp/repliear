import * as t from "io-ts";
import type { NextApiRequest, NextApiResponse } from "next";
import { ExecuteStatementCommandOutput, Field } from "@aws-sdk/client-rds-data";
import { transact } from "../../backend/rds";
import { getCookieVersion, getLastMutationID } from "../../backend/data";
import { must } from "../../backend/decode";

export default async (req: NextApiRequest, res: NextApiResponse) => {
  console.log(`Processing pull`, req.body);

  const pull = must(pullRequest.decode(req.body));
  let cookie = pull.baseStateID == "" ? 0 : parseInt(pull.baseStateID);

  console.time(`Reading all Shapes...`);
  let shapes, clientStates;
  let lastMutationID = 0;

  await transact(async (executor) => {
    [shapes, clientStates, lastMutationID, cookie] = await Promise.all([
      executor("SELECT * FROM Shape WHERE Version > :version", {
        version: { longValue: cookie },
      }),
      executor("SELECT * FROM ClientState WHERE Version > :version", {
        version: { longValue: cookie },
      }),
      getLastMutationID(executor, pull.clientID),
      getCookieVersion(executor),
    ]);
  });
  console.log({ lastMutationID });
  console.timeEnd(`Reading all Shapes...`);

  // Grump. Typescript seems to not understand that the argument to transact()
  // is guaranteed to have been called before transact() exits.
  shapes = (shapes as any) as ExecuteStatementCommandOutput;
  clientStates = (clientStates as any) as ExecuteStatementCommandOutput;

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

  for (let entries of [shapes, clientStates]) {
    if (entries.records) {
      for (let row of entries.records) {
        const [
          { stringValue: id },
          { stringValue: content },
          { booleanValue: deleted },
        ] = row as [
          Field.StringValueMember,
          Field.StringValueMember,
          Field.BooleanValueMember
        ];
        const prefix = entries == shapes ? "shape" : "client-state";
        if (deleted) {
          resp.patch.push({
            op: "remove",
            path: `/${prefix}-${id}`,
          });
        } else {
          resp.patch.push({
            op: "replace",
            path: `/${prefix}-${id}`,
            valueString: content,
          });
        }
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
