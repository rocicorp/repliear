import { CosmosClient } from '@azure/cosmos';
import config from './config';
import dbContext from './databaseContext';

import type { NextApiRequest, NextApiResponse } from "next";

export default async (req: NextApiRequest, res: NextApiResponse) => {
  const uniqueID = Math.random().toString(36).substr(2);

  const { endpoint, key, databaseId, containerId } = config;
  const client = new CosmosClient({ endpoint, key });
  const database = client.database(databaseId);
  const container = database.container(containerId);

  console.time('Processing push: ' + uniqueID);

  const newItem = {
    id: Math.random().toString(36).substr(2),
    content: `{
      "ref": Ref(Collection("objects"), "290282750093558285"),
      "ts": 1613670707753000,
      "data": {
        "width": 163,
        "height": 84,
        "rotate": 0,
        "strokeWidth": 0,
        "fill": "pink",
        "radius": "0",
        "blendMode": "normal",
        "type": "rectangle",
        "x": 190,
        "y": 334
      }
    }`,
  };
  const { resource: createdItem } = await container.items.create(newItem);
  console.timeEnd('Processing push: ' + uniqueID);
  console.log(`\r\nCreated new item: ${createdItem.id}\r\n`);


  res.status(200).json({});
};
