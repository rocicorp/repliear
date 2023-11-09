import type {Comment, Description, Issue} from 'shared';
import type {Executor} from '../pg';
import {getReactSampleData, SampleData} from './sample-issues';

const batchSize = 2000;
/**
 * Seed the database with the initial data if the DB has not already been seeded.
 */
export async function seedDatabase(executor: Executor) {
  // check if issues exists
  // if they do, bail
  // if not, load the react issue dataset in.
  const {rowCount} = await executor(/*sql*/ `SELECT * FROM issue LIMIT 1`);

  if (rowCount && rowCount > 0) {
    return;
  }

  const sampleData = await getReactSampleData();
  const start = performance.now();

  await saveBatches(executor, sampleData, d => [d.issue], saveIssueBatch);
  await saveBatches(
    executor,
    sampleData,
    d => [d.description],
    saveDescriptionBatch,
  );
  await saveBatches(executor, sampleData, d => d.comments, saveCommentBatch);
  const end = performance.now();
  console.log(`Seeded database in ${end - start}ms`);
}

async function saveBatches<T>(
  executor: Executor,
  sampleData: SampleData[],
  getter: (data: SampleData) => T[],
  saveBatch: (executor: Executor, batch: T[]) => Promise<void>,
) {
  let batch: T[] = [];
  for (const data of sampleData) {
    const items = getter(data);
    batch.push(...items);
    if (batch.length >= batchSize) {
      await saveBatch(executor, batch);
      batch = [];
    }
  }
  await saveBatch(executor, batch);
}

async function saveIssueBatch(executor: Executor, batch: Issue[]) {
  if (batch.length === 0) {
    return;
  }
  const placeholders = [];
  const values = [];
  const stride = 9;
  for (let i = 0; i < batch.length; i++) {
    const issue = batch[i];
    placeholders.push(
      `($${i * stride + 1}, $${i * stride + 2}, $${i * stride + 3}, $${
        i * stride + 4
      }, $${i * stride + 5}, $${i * stride + 6}, $${i * stride + 7}, $${
        i * stride + 8
      }, $${i * stride + 9})`,
    );
    values.push(
      issue.id,
      issue.title,
      issue.priority,
      issue.status,
      issue.modified,
      issue.created,
      issue.creator,
      issue.kanbanOrder,
      1,
    );
  }

  await executor(
    /*sql*/ `INSERT INTO issue (
      id,
      title,
      priority,
      status,
      modified,
      created,
      creator,
      kanbanorder,
      rowversion
    ) VALUES ${placeholders.join(', ')}`,
    values,
  );
}

async function saveDescriptionBatch(executor: Executor, batch: Description[]) {
  if (batch.length === 0) {
    return;
  }
  const placeholders = [];
  const values = [];
  const stride = 3;
  for (let i = 0; i < batch.length; i++) {
    const description = batch[i];
    placeholders.push(
      `($${i * stride + 1}, $${i * stride + 2}, $${i * stride + 3})`,
    );
    values.push(description.id, description.body, 1);
  }

  await executor(
    /*sql*/ `INSERT INTO description (
    id,
    body,
    rowversion
  ) VALUES ${placeholders.join(', ')}`,
    values,
  );
}

async function saveCommentBatch(executor: Executor, batch: Comment[]) {
  if (batch.length === 0) {
    return;
  }
  const placeholders = [];
  const values = [];
  const stride = 6;
  for (let i = 0; i < batch.length; i++) {
    const comment = batch[i];
    placeholders.push(
      `($${i * stride + 1}, $${i * stride + 2}, $${i * stride + 3}, $${
        i * stride + 4
      }, $${i * stride + 5}, $${i * stride + 6})`,
    );
    values.push(
      comment.id,
      comment.issueID,
      comment.created,
      comment.body,
      comment.creator,
      1,
    );
  }

  await executor(
    /*sql*/ `INSERT INTO comment (
    id,
    issueid,
    created,
    body,
    creator,
    rowversion
  ) VALUES ${placeholders.join(', ')}`,
    values,
  );
}
