import { createDatabase, initSpaces } from "../../backend/data";
import { transact } from "../../backend/pg";
import type { NextApiRequest, NextApiResponse } from "next";
import { getReactIssues } from "backend/sample-issues";
import { getReactComments } from "backend/sample-comments";

const init = async (req: NextApiRequest, res: NextApiResponse) => {
  let count = 10;
  try {
    count = parseInt(req.query["count"] as string);
  } catch (e) {
    // ignore
  }
  if (!count) {
    count = 10;
  }
  await transact(async (executor) => {
    await createDatabase(executor);
    await initSpaces(executor, count, getReactIssues, getReactComments);
  });
  res.end();
};

export default init;
