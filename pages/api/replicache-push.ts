import * as t from 'io-ts';
import {ExecuteStatementFn, transact} from '../../backend/rds';
import {MutatorStorage, createShape, createShapeArgs, moveShape, moveShapeArgs} from '../../shared/mutators';
import {getLastMutationID, getShape, putShape, setLastMutationID} from '../../backend/data';
import {UserError} from '../../backend/user_error';
import {must} from '../../backend/decode';
import Pusher from 'pusher';
import type { NextApiRequest, NextApiResponse } from "next";

const mutation = t.type({
  id: t.number,
  name: t.string,
  args: t.object,
});

const pushRequest = t.type({
  clientID: t.string,
  mutations: t.array(mutation),
});

export default async (req: NextApiRequest, res: NextApiResponse) => {
  const push = must(pushRequest.decode(req.body));

  for (const mutation of push.mutations) {
    await transact(async (executor) => {
      console.log('Processing mutation', mutation);

      const lastMutationID = await getLastMutationID(executor, push.clientID);
      console.log('lastMutationID:', lastMutationID);

      const expectedMutationID = lastMutationID + 1;
      if (mutation.id < expectedMutationID) {
        console.log('This mutation has already been processed. Nothing to do.');
        return;
      }
      if (mutation.id > expectedMutationID) {
        console.log('This mutation is from the future. Nothing to do but wait.');
        return;
      }

      const ms = mutatorStorage(executor);
      const {args} = mutation;

      try {
        switch (mutation.name) {
          case  'moveShape':
            await moveShape(ms, must(moveShapeArgs.decode(mutation.args)));
            break;
          case 'createShape':
            await createShape(ms, must(createShapeArgs.decode(mutation.args)))
            break;
          default:
            throw new UserError(`Unknown mutation: ${mutation.name}`);
        }
      } catch (e: any) {
        if (e instanceof UserError) {
          console.error('Invalid mutation, skipping. ', e);
        } else {
          throw e;
        }
      }

      await setLastMutationID(executor, push.clientID, expectedMutationID);
    });
  }

  const pusher = new Pusher({	
    appId: "1157097",	
    key: "d9088b47d2371d532c4c",	
    secret: "64204dab73c42e17afc3",	
    cluster: "us3",	
    useTLS: true	
  });	
  console.time(`sending poke...`);	
  await pusher.trigger("default", "poke", {});	
  console.timeEnd(`sending poke...`);

  res.status(200).json({});
};

function mutatorStorage(executor: ExecuteStatementFn): MutatorStorage {
  return {
    getShape: getShape.bind(null, executor),
    putShape: putShape.bind(null, executor),
  };
}
