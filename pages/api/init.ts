import { createDatabase } from "../../backend/data";
import type { NextApiRequest, NextApiResponse } from "next";

export default async (req: NextApiRequest, res: NextApiResponse) => {
  await createDatabase();
  res.end("OK");
};
