import {test, expect, vi} from 'vitest';
import {Deletes, Puts, syncedTables} from '../cvr';
import {hasNextPage, isResponseEmpty, LIMIT, mergePuts} from '../pull';

// mock out pg.
vi.mock('../../pg');

test('is response empty', () => {
  const response = {
    puts: Object.fromEntries(syncedTables.map(t => [t, []])) as unknown as Puts,
    deletes: Object.fromEntries(
      syncedTables.map(t => [t, []]),
    ) as unknown as Deletes,
  };
  expect(isResponseEmpty(response)).toBe(true);

  response.deletes.issue.push('1');
  expect(isResponseEmpty(response)).toBe(false);

  response.deletes.issue = [];
  response.puts.description.push({id: '1', version: 1, body: 'title'});
  expect(isResponseEmpty(response)).toBe(false);
});

test('has next page', () => {
  const response = {
    puts: Object.fromEntries(syncedTables.map(t => [t, []])) as unknown as Puts,
    deletes: Object.fromEntries(
      syncedTables.map(t => [t, []]),
    ) as unknown as Deletes,
  };
  expect(hasNextPage(response)).toBe(false);

  response.deletes.issue.push('1');
  expect(hasNextPage(response)).toBe(false);

  response.deletes.issue = [];
  response.puts.description.push({id: '1', version: 1, body: 'title'});
  expect(hasNextPage(response)).toBe(false);

  response.puts.description = [];
  for (let i = 0; i < LIMIT; i++) {
    response.puts.description.push({id: `${i}`, version: i, body: 'desc'});
  }
  expect(hasNextPage(response)).toBe(true);
});

test('merge puts', () => {
  const target = {
    puts: Object.fromEntries(syncedTables.map(t => [t, []])) as unknown as Puts,
    deletes: Object.fromEntries(
      syncedTables.map(t => [t, []]),
    ) as unknown as Deletes,
  };
  const source = {
    puts: Object.fromEntries(syncedTables.map(t => [t, []])) as unknown as Puts,
    deletes: Object.fromEntries(
      syncedTables.map(t => [t, []]),
    ) as unknown as Deletes,
  };
  source.puts.issue.push({
    id: '1',
    version: 1,
    title: 'title',
    created: Date.now(),
    modified: Date.now(),
    creator: '1',
    status: 'DONE',
    priority: 'LOW',
    kanbanOrder: 'aa',
  });
  source.puts.description.push({id: '1', version: 1, body: 'body'});
  source.puts.comment.push({
    id: '1',
    version: 1,
    body: 'body',
    creator: '1',
    created: Date.now(),
    issueID: '1',
  });

  mergePuts(target.puts, source.puts);

  expect(target.puts.issue).toEqual(source.puts.issue);
  expect(target.puts.description).toEqual(source.puts.description);
  expect(target.puts.comment).toEqual(source.puts.comment);
});
