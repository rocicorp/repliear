/**
 * Abstract RDS (SQL) to entities (Shape, Client).
 */

 import {shape} from '../shared/shape';
import {must} from './decode';

import type {ExecuteStatementFn} from './rds';
import type {Shape} from '../shared/shape';

export async function getLastMutationID(executor: ExecuteStatementFn, clientID: string): Promise<number> {
  const result = (await executor('SELECT LastMutationID FROM Client WHERE Id = :id', {
    id: {stringValue: clientID}
  }));
  return result.records?.[0]?.[0]?.longValue ?? 0;
}

export async function setLastMutationID(executor: ExecuteStatementFn, clientID: string, lastMutationID: number): Promise<void> {
  await executor('INSERT INTO Client (Id, LastMutationID) VALUES (:id, :lastMutationID) ' +
  'ON DUPLICATE KEY UPDATE Id = :id, LastMutationID = :lastMutationID', {
    id: {stringValue: clientID},
    lastMutationID: {longValue: lastMutationID},
  })
}

export async function getShape(executor: ExecuteStatementFn, id: string): Promise<Shape|null> {
  const {records} = await executor('SELECT Content FROM Shape WHERE Id = :id', {
    id: {stringValue: id}
  });
  const content = records?.[0]?.[0]?.stringValue;
  if (!content) {
    return null;
  }
  return must(shape.decode(JSON.parse(content)));
}

export async function putShape(executor: ExecuteStatementFn, id: string, shape: Shape): Promise<void> {
  await executor('INSERT INTO Shape (Id, Content) VALUES (:id, :content) ' +
    'ON DUPLICATE KEY UPDATE Id = :id, Content = :content', {
      id: {stringValue: id},
      content: {stringValue: JSON.stringify(shape)}
    });
}
