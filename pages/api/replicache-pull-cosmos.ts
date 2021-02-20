import { CosmosClient } from '@azure/cosmos';
import config from './config';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async (req: NextApiRequest, res: NextApiResponse) => {
  const uniqueID = Math.random().toString(36).substr(2);
  const { endpoint, key, databaseId, containerId } = config;
  const client = new CosmosClient({ endpoint, key });
  const database = client.database(databaseId);
  const container = database.container(containerId);

  console.log(`Processing pull ${uniqueID}`);

  // query to return all items
  const querySpec = {
    query: "SELECT * from c OFFSET 0 LIMIT 50"
  };

  // read all items in the Items container
  const { resources: items } = await container.items
    .query(querySpec)
    .fetchAll();

  res.json(items);

  res.end();
};
