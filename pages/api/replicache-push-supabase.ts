import { createClient } from '@supabase/supabase-js';
import Pusher from 'pusher';

import type { NextApiRequest, NextApiResponse } from "next";

export default async (req: NextApiRequest, res: NextApiResponse) => {
  const uniqueID = Math.random().toString(36).substr(2);
  console.log(`Processing push ${uniqueID}`, req.body);

  const supabase = createClient("https://iovzpefufdsclrdhklbq.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlhdCI6MTYxMzcyNTUyMCwiZXhwIjoxOTI5MzAxNTIwfQ.NdNq59B5DMINRzugFsY26AFtwp9T3AA5gywOIZH7DAM");
  console.time('Inserting 100 rows');
  var p = [];
  for (var i = 0; i < 10; i++) {
    await supabase.from('Shape').insert([
      {id: Math.random().toString(36).substr(2), content: `{
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
      }`}
    ], {
      returning: 'minimal',
    });
  }
  console.log(await Promise.all(p));
  console.timeEnd('Inserting 100 rows');

  res.status(200).json({});
};
