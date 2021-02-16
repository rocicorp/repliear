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
  let infos = [];
  for (let m of batch.mutations) {
    if (m.name != "moveShape") {
      throw new Error("Unexpected mutation: " + m.name);
    }
    const { id: objectID, dx, dy } = m.args;
    const params = [batch.clientID, m.id, objectID, dx, dy];
    console.log("Calling replicache_push with: ", params);
    const result = await client.query(q.Call("replicache_push", ...params));
  }
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
