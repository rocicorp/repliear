import faunadb from "faunadb";
import { faunaClient } from "./fauna";

import type { NextApiRequest, NextApiResponse } from "next";

const q = faunadb.query;

type Mutation = {
  id: string;
  name: string;
  args: any;
};

export default async (req: NextApiRequest, res: NextApiResponse) => {
  console.log("Processing push", req.body);

  validatePayload(req.body);

  const client = faunaClient();
  const batch = req.body as { clientID: string; mutations: Array<Mutation> };

  // TODO: replicache_push does not correctly honor transaction isolation -
  // an error anywhere in the batch takes down the whole batch.
  const query =
    q.Foreach(batch.mutations,
      q.Lambda('mutation',
        q.Call('replicache_push',
          batch.clientID,
          q.Select('id', q.Var('mutation')),
          q.Select(['args', 'id'], q.Var('mutation')),
          q.Select(['args', 'dx'], q.Var('mutation')),
          q.Select(['args', 'dy'], q.Var('mutation')))));
  console.log('sending', query);
  await client.query(query);
  console.log('done');
  return {};
};

function validatePayload(payload: any) {
  if (!payload) {
    throw new Error("body is required");
  }
  if (!payload.clientID) {
    throw new Error("clientID is required");
  }
  if (!Array.isArray(payload.mutations)) {
    throw new Error("mutations is required and must be an array");
  }
  for (let m of payload.mutations) {
    if (typeof m.id != "number" || typeof m.name != "string") {
      throw new Error("Invalid mutation");
    }
  }
}
