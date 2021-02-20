import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async (req: NextApiRequest, res: NextApiResponse) => {
  const uniqueID = Math.random().toString(36).substr(2);
  console.log(`Processing pull ${uniqueID}`, req.body);

  const supabase = createClient("https://iovzpefufdsclrdhklbq.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlhdCI6MTYxMzcyNTUyMCwiZXhwIjoxOTI5MzAxNTIwfQ.NdNq59B5DMINRzugFsY26AFtwp9T3AA5gywOIZH7DAM");
  res.json(await supabase.from('Shape').select('*'));
  res.end();
};
