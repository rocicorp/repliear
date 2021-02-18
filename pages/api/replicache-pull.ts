import faunadb from 'faunadb';
import { faunaClient } from './fauna';

import type { NextApiRequest, NextApiResponse } from 'next';

const q = faunadb.query;

export default async (req: NextApiRequest, res: NextApiResponse) => {
  const uniqueID = Math.random().toString(36).substr(2);
  const client = faunaClient();

  if (!req.body.clientID) {
    res.status(400).send('clientID is required');
  }

  console.time(`${uniqueID}: sending to fauna...`);
  const result = await client.query({
    lastMutationID: q.Call('last_mutation_id', req.body.clientID),
    objects: q.Map(q.Paginate(
      q.Documents(q.Collection('objects')), {size: 100000}),
      q.Lambda('r', q.Get(q.Var('r')))),
  }) as any;
  console.timeEnd(`${uniqueID}: sending to fauna...`);

  const response = {
    lastMutationID: result.lastMutationID,
    clientView: Object.fromEntries(
      result.objects.data.map(entry => [`/object/${entry.ref.id}`, entry.data]))
  };
  console.debug({response});
  res.status(200).json(response);
};
