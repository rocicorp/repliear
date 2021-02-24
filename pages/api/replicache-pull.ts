import * as t from 'io-ts';
import type { NextApiRequest, NextApiResponse } from 'next';
import { ExecuteStatementCommandOutput } from '@aws-sdk/client-rds-data';
import {transact} from '../../backend/rds';
import {getLastMutationID} from '../../backend/data';
import {must} from '../../backend/decode';

export default async (req: NextApiRequest, res: NextApiResponse) => {
  console.log(`Processing pull`, req.body);

  const pull = must(pullRequest.decode(req.body));

  console.time(`Reading all Shapes...`);
  let entries;
  let lastMutationID = 0;

  await transact(async (executor) => {
    entries = (await executor('SELECT * FROM Shape')) ?? [];
    lastMutationID = await getLastMutationID(executor, pull.clientID);
  });
  console.timeEnd(`Reading all Shapes...`);

  // Grump. Typescript seems to not understand that the argument to transact()
  // is guaranteed to have been called before transact() exits.
  entries = entries as any as ExecuteStatementCommandOutput;

  if (entries.records) {
    const resp = {
      lastMutationID,
      clientView: Object.fromEntries(
        entries.records.map(
          ([id, content]) => {
            const s = content?.stringValue;
            if (!id.stringValue) {
              throw new Error(`Shape found with no id`);
            }
            if (!s) {
              throw new Error(`No content for shape: ${id}`);
            }
            return ['/shape/' + id.stringValue, JSON.parse(s)];
          }
        )
      ),
    };
    console.log(`Returning ${entries.records.length} shapes...`);
    res.json(resp);
  }
  res.end();
};

const pullRequest = t.type({
  clientID: t.string,
});
