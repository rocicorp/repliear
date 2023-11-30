import type {Executor} from '../pg';
import type {SearchResult} from '../data';
import type {Comment, Description, Issue} from 'shared';
import {findDeletions, findUnsentItems} from './cvr';

const LIMIT = 3000;

type Page = {
  issues: Issue[];
  descriptions: Description[];
  comments: Comment[];
  issueDeletes: string[];
  descriptionDeletes: string[];
  commentDeletes: string[];
};

export function isPageEmpty(page: Page) {
  return (
    page.issues.length +
      page.comments.length +
      page.descriptions.length +
      page.descriptionDeletes.length +
      page.commentDeletes.length +
      page.issueDeletes.length ===
    0
  );
}

export function hasNextPage(page: Page) {
  return (
    page.issues.length +
      page.comments.length +
      page.descriptions.length +
      page.descriptionDeletes.length +
      page.commentDeletes.length +
      page.issueDeletes.length >=
    LIMIT
  );
}

export async function readNextPage(
  executor: Executor,
  clientGroupID: string,
  order: number,
) {
  let remaining = LIMIT;
  const issues: Issue[] = [];
  const descriptions: Description[] = [];
  const comments: Comment[] = [];

  const issueDeletes: string[] = [];
  const descriptionDeletes: string[] = [];
  const commentDeletes: string[] = [];

  const issueMeta: SearchResult[] = [];
  const descriptionMeta: SearchResult[] = [];
  const commentMeta: SearchResult[] = [];

  function buildReturn() {
    return {
      issues,
      descriptions,
      comments,
      issueDeletes,
      descriptionDeletes,
      commentDeletes,
      issueMeta,
      descriptionMeta,
      commentMeta,
    };
  }

  // TODO: optimize to not require 3 queries in turn.
  // Issue all of them at once and throw away results over limit?
  // Issue a query just for `ids` and `versions` via a union then fulfill a page of data?
  const {rows: issueRows} = await findUnsentItems(
    executor,
    'issue',
    clientGroupID,
    order,
    remaining,
  );
  for (const r of issueRows) {
    issueMeta.push({
      id: r.id,
      version: r.version,
    });
    issues.push({
      id: r.id,
      title: r.title,
      priority: r.priority,
      status: r.status,
      modified: parseInt(r.modified),
      created: parseInt(r.created),
      creator: r.creator,
      kanbanOrder: r.kanbanorder,
    });
  }

  remaining -= issueRows.length;
  if (remaining <= 0) {
    return buildReturn();
  }

  const {rows: descriptionRows} = await findUnsentItems(
    executor,
    'description',
    clientGroupID,
    order,
    remaining,
  );
  for (const r of descriptionRows) {
    descriptionMeta.push({
      id: r.id,
      version: r.version,
    });
    descriptions.push({
      id: r.id,
      body: r.body,
    });
  }

  remaining -= descriptionRows.length;
  if (remaining <= 0) {
    return buildReturn();
  }

  const {rows: commentRows} = await findUnsentItems(
    executor,
    'comment',
    clientGroupID,
    order,
    remaining,
  );
  for (const r of commentRows) {
    commentMeta.push({
      id: r.id,
      version: r.version,
    });
    comments.push({
      id: r.id,
      issueID: r.issueid,
      created: parseInt(r.created),
      body: r.body,
      creator: r.creator,
    });
  }

  remaining -= commentRows.length;
  if (remaining <= 0) {
    return buildReturn();
  }

  const [
    {rows: issueDeleteRows},
    {rows: descriptionDeleteRows},
    {rows: commentDeleteRows},
  ] = await Promise.all([
    findDeletions(executor, 'issue', clientGroupID, order, remaining),
    findDeletions(executor, 'description', clientGroupID, order, remaining),
    findDeletions(executor, 'comment', clientGroupID, order, remaining),
  ]);

  // Record deletes against the _current_ CVR
  // If someone asks for the current CVR again we send the recorded
  // deletes since we can't compute deletes anymore.
  for (const r of issueDeleteRows) {
    issueDeletes.push(r.entity_id);
  }
  remaining -= issueDeleteRows.length;
  if (remaining <= 0) {
    return buildReturn();
  }

  for (const r of descriptionDeleteRows) {
    descriptionDeletes.push(r.entity_id);
  }
  remaining -= descriptionDeleteRows.length;
  if (remaining <= 0) {
    return buildReturn();
  }

  for (const r of commentDeleteRows) {
    commentDeletes.push(r.entity_id);
  }
  remaining -= commentDeleteRows.length;

  return buildReturn();
}
