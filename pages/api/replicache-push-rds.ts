import {client, executeStatement} from './rds';
import Pusher from 'pusher';

import type { NextApiRequest, NextApiResponse } from "next";

export default async (req: NextApiRequest, res: NextApiResponse) => {
  const uniqueID = () => Math.random().toString(36).substr(2);
  console.log(`Processing push ${uniqueID()}`, req.body);
  console.time(`Inserting row...`);
  await executeStatement('INSERT INTO Shape (Id, Content) VALUES (:id, :content)', {
    id: {stringValue: uniqueID()},
    content: {
      stringValue: `{
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
      }`},
    });
  console.timeEnd(`Inserting row...`);

  res.status(200).json({});
};
