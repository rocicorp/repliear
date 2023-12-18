/* eslint-disable @typescript-eslint/no-explicit-any */
/*
import {test, expect, vi} from 'vitest';
import {
  findCreates,
  findDeletes,
  findMaxClientViewVersion,
  findRowsForFastforward,
  findUpdates,
  getCVR,
  recordDeletes,
  recordUpdates,
  SyncedTables,
  syncedTables,
} from '../cvr';
import {nanoid} from 'nanoid';

vi.mock('../../pg');

import {Executor, withExecutor} from '../../pg';
import {createComment, putDescription, putIssue} from '../../data';
import {makeComment, makeDescription, makeIssue, reset} from './example-data';

test('getCVR', async () => {
  const cgid = nanoid();
  await withExecutor(async executor => {
    await executor(/*sql* / `INSERT INTO "client_view"
        ("client_group_id", "client_version", "version") VALUES
        ('${cgid}', 1, 1)`);

    let cvr = await getCVR(executor, cgid, 1);
    expect(cvr).toEqual({
      clientGroupID: cgid,
      clientVersion: 1,
      order: 1,
    });
    cvr = await getCVR(executor, nanoid(), 1);
    expect(cvr).toBeUndefined();
    cvr = await getCVR(executor, cgid, 2);
    expect(cvr).toBeUndefined();
  });
  expect(true).toBe(true);
});

test('findMaxClientViewVersion', async () => {
  const cgid = nanoid();
  await withExecutor(async executor => {
    await executor(/*sql* / `INSERT INTO "client_view"
        ("client_group_id", "version", "client_version") VALUES
        ('${cgid}', 1, 1), ('${cgid}', 2, 2), ('${cgid}', 3, 3)`);

    let version = await findMaxClientViewVersion(executor, cgid);
    expect(version).toBe(3);

    version = await findMaxClientViewVersion(executor, 'asdf');
    expect(version).toBe(0);
  });

  expect(true).toBe(true);
});

test('findRowsForFastForward', async () => {
  const prepWithData = async (
    executor: Executor,
    args: {readonly clientGroupID: string},
  ) => {
    await putIssue(executor, makeIssue());
    await putDescription(executor, makeDescription());
    await createComment(executor, makeComment());

    for (const table of syncedTables) {
      const rows = await findCreates(
        executor,
        table,
        args.clientGroupID,
        0,
        100,
      );
      await recordUpdates(executor, table, args.clientGroupID, 1, rows);
    }
  };

  const cases = [
    [
      'Empty tables so no rows',
      {
        clientGroupID: nanoid(),
        cookieClientViewVersion: 0,
        excludeIds: [],
      },
      async () => {
        // empty
      },
      Object.fromEntries(syncedTables.map(t => [t, []])),
    ],
    [
      'Tables have data but no rows for the given client group',
      {
        clientGroupID: nanoid(),
        cookieClientViewVersion: 0,
        excludeIds: [],
      },
      async executor => {
        await putIssue(executor, makeIssue());
        await putDescription(executor, makeDescription());
        await createComment(executor, makeComment());
      },
      Object.fromEntries(syncedTables.map(t => [t, []])),
    ],
    [
      'Tables have data and have rows for the given client group but we are already up to date',
      {
        clientGroupID: nanoid(),
        cookieClientViewVersion: 1,
        excludeIds: [],
      },
      prepWithData,
      Object.fromEntries(syncedTables.map(t => [t, []])),
    ],
    [
      'Tables have data and have rows for the given client group. We are not up to date so ff should return rows',
      {
        clientGroupID: nanoid(),
        cookieClientViewVersion: 0,
        excludeIds: [],
      },
      prepWithData,
      (msg: string, table: SyncedTables, rows: readonly {id: string}[]) => {
        switch (table) {
          case 'issue':
            expect(
              rows.map(r => r.id),
              msg,
            ).toEqual(['iss-0']);
            break;
          case 'description':
            expect(
              rows.map(r => r.id),
              msg,
            ).toEqual(['iss-0']);
            break;
          case 'comment':
            expect(
              rows.map(r => r.id),
              msg,
            ).toEqual(['com-0']);
            break;
        }
      },
    ],
    [
      'Same test as above but we pass all ids as excluded',
      {
        clientGroupID: nanoid(),
        cookieClientViewVersion: 0,
        excludeIds: ['iss-0', 'com-0'],
      },
      prepWithData,
      Object.fromEntries(syncedTables.map(t => [t, []])),
    ],
  ] as TestCase[];

  // do these sequentially since better-sqlite3 will not work as expected
  // if we're running multiple transactions at once.
  await makeCheckCases(
    cases,
    async (executor, table, args) =>
      await findRowsForFastforward(
        executor,
        table,
        args.clientGroupID,
        args.cookieClientViewVersion,
        args.excludeIds,
      ),
  )();
});

type CaseArgs = {
  readonly clientGroupID: string;
  readonly cookieClientViewVersion: number;
  readonly excludeIds: readonly string[];
};
type TestCase = [
  string,
  CaseArgs,
  (executor: Executor, args: CaseArgs) => Promise<void>,
  (
    | Record<SyncedTables, readonly {id: string}[]>
    | ((msg: string, table: SyncedTables, rows: unknown) => void)
  ),
];

function makeCheckCases<T>(
  cases: readonly TestCase[],
  fn: (executor: Executor, table: SyncedTables, args: CaseArgs) => Promise<T>,
) {
  return async () =>
    await withExecutor(async executor => {
      for (const [msg, args, seed, expected] of cases) {
        await clearTables(executor);
        reset();
        await seed(executor, args);
        for (const table of syncedTables) {
          const rows = await fn(executor, table, args);
          if (typeof expected === 'function') {
            expected(msg, table, rows);
          } else {
            expect(rows, msg).toEqual(expected[table]);
          }
        }
      }
    });
}

test('findDeletes', async () => {
  const cases: TestCase[] = [
    [
      'Empty tables so no rows',
      {
        clientGroupID: nanoid(),
        cookieClientViewVersion: 0,
        excludeIds: [],
      },
      async () => {
        // empty
      },
      Object.fromEntries(syncedTables.map(t => [t, []])) as any,
    ],
    [
      'CVR has entries but base tables are empty. Should be tagged as deletes',
      {
        clientGroupID: nanoid(),
        cookieClientViewVersion: 0,
        excludeIds: [],
      },
      async (executor, args) => {
        for (const table of syncedTables) {
          await recordUpdates(executor, table, args.clientGroupID, 1, [
            {
              id: '1',
              version: 1,
            },
          ]);
        }
      },
      Object.fromEntries(syncedTables.map(t => [t, ['1']])) as any,
    ],
    [
      'CVR has entries and base tables are empty but CVR entries are recorded as deleted. These pre-sent deletes should not be returned',
      {
        clientGroupID: nanoid(),
        cookieClientViewVersion: 1,
        excludeIds: [],
      },
      async (executor, args) => {
        for (const table of syncedTables) {
          await recordDeletes(executor, table, args.clientGroupID, 1, ['1']);
        }
      },
      Object.fromEntries(syncedTables.map(t => [t, []])) as any,
    ],
    [
      'Same as above but there are some deletes not yet sent. Those should appear and the sent deletes should not.',
      {
        clientGroupID: nanoid(),
        cookieClientViewVersion: 1,
        excludeIds: [],
      },
      async (executor, args) => {
        for (const table of syncedTables) {
          await recordDeletes(executor, table, args.clientGroupID, 1, ['1']);
        }
        for (const table of syncedTables) {
          await recordDeletes(executor, table, args.clientGroupID, 2, ['2']);
        }
      },
      Object.fromEntries(syncedTables.map(t => [t, ['2']])) as any,
    ],
    [
      'We have client view entries for all the rows in the base tables. Should return nothing.',
      {
        clientGroupID: nanoid(),
        cookieClientViewVersion: 1,
        excludeIds: [],
      },
      async (executor, args) => {
        await putIssue(executor, makeIssue());
        await putDescription(executor, makeDescription());
        await createComment(executor, makeComment());
        for (const table of syncedTables) {
          const rows = await findCreates(
            executor,
            table,
            args.clientGroupID,
            0,
            100,
          );
          await recordUpdates(executor, table, args.clientGroupID, 1, rows);
        }
      },
      Object.fromEntries(syncedTables.map(t => [t, []])) as any,
    ],
    [
      'Some rows are recorded as deletes but they were re-inserted later. Should not return them as deletes.',
      {
        clientGroupID: nanoid(),
        cookieClientViewVersion: 0,
        excludeIds: [],
      },
      async (executor, args) => {
        const issue = makeIssue();
        const description = makeDescription();
        const comment = makeComment();
        await recordDeletes(executor, 'issue', args.clientGroupID, 1, [
          issue.id,
        ]);
        await recordDeletes(executor, 'description', args.clientGroupID, 1, [
          description.id,
        ]);
        await recordDeletes(executor, 'comment', args.clientGroupID, 1, [
          comment.id,
        ]);
        await putIssue(executor, issue);
        await putDescription(executor, description);
        await createComment(executor, comment);
      },
      Object.fromEntries(syncedTables.map(t => [t, []])) as any,
    ],
  ];

  await makeCheckCases(
    cases,
    async (executor, table, args) =>
      await findDeletes(
        executor,
        table,
        args.clientGroupID,
        args.cookieClientViewVersion,
      ),
  )();
});

test('findUpdates', async () => {
  const cases: TestCase[] = [
    [
      'Empty tables so no rows',
      {
        clientGroupID: nanoid(),
        cookieClientViewVersion: 0,
        excludeIds: [],
      },
      async () => {
        // empty
      },
      Object.fromEntries(syncedTables.map(t => [t, []])) as any,
    ],
    [
      'Base table has entries that do not exist in the CVR. These will not be returned as they are not updates but are creates.',
      {
        clientGroupID: nanoid(),
        cookieClientViewVersion: 0,
        excludeIds: [],
      },
      async executor => {
        await putIssue(executor, makeIssue());
        await putDescription(executor, makeDescription());
        await createComment(executor, makeComment());
      },
      Object.fromEntries(syncedTables.map(t => [t, []])) as any,
    ],
    [
      'Base table has entries that exist in the CVR at the same version. This means no change so these will not be returned',
      {
        clientGroupID: nanoid(),
        cookieClientViewVersion: 0,
        excludeIds: [],
      },
      async (executor, args) => {
        await putIssue(executor, makeIssue());
        await putDescription(executor, makeDescription());
        await createComment(executor, makeComment());
        for (const table of syncedTables) {
          const rows = await findCreates(
            executor,
            table,
            args.clientGroupID,
            0,
            100,
          );
          await recordUpdates(executor, table, args.clientGroupID, 1, rows);
        }
      },
      Object.fromEntries(syncedTables.map(t => [t, []])) as any,
    ],
    [
      'Base table has entries that exist in the CVR at a different version. These will be returned',
      {
        clientGroupID: nanoid(),
        cookieClientViewVersion: 0,
        excludeIds: [],
      },
      async (executor, args) => {
        const issue = makeIssue();
        const desc = makeDescription();
        await putIssue(executor, issue);
        await putDescription(executor, desc);
        await createComment(executor, makeComment());
        for (const table of syncedTables) {
          const rows = await findCreates(
            executor,
            table,
            args.clientGroupID,
            0,
            100,
          );
          await recordUpdates(executor, table, args.clientGroupID, 1, rows);
        }
        await putIssue(executor, issue);
        await putDescription(executor, desc);
      },
      (msg: string, table: SyncedTables, rows: readonly {id: string}[]) => {
        switch (table) {
          case 'issue':
            expect(
              rows.map(r => r.id),
              msg,
            ).toEqual(['iss-0']);
            break;
          case 'description':
            expect(
              rows.map(r => r.id),
              msg,
            ).toEqual(['iss-0']);
            break;
          // no comments since comments are immutable and never updated, only created
          case 'comment':
            expect(rows, msg).toEqual([]);
            break;
        }
      },
    ],
    [
      'Re-creations of previously deleted rows are not returned by findUpdates but rather returned by findCreates',
      {
        clientGroupID: nanoid(),
        cookieClientViewVersion: 0,
        excludeIds: [],
      },
      async (executor, args) => {
        const issue = makeIssue();
        const description = makeDescription();
        const comment = makeComment();
        await putIssue(executor, issue);
        await putDescription(executor, description);
        await createComment(executor, comment);
        await recordDeletes(executor, 'issue', args.clientGroupID, 1, [
          issue.id,
        ]);
        await recordDeletes(executor, 'description', args.clientGroupID, 1, [
          description.id,
        ]);
        await recordDeletes(executor, 'comment', args.clientGroupID, 1, [
          comment.id,
        ]);
      },
      Object.fromEntries(syncedTables.map(t => [t, []])) as any,
    ],
  ];

  await makeCheckCases(
    cases,
    async (executor, table, args) =>
      await findUpdates(executor, table, args.clientGroupID),
  )();
});

test('findCreates', async () => {
  const allCreated = (
    msg: string,
    table: SyncedTables,
    rows: readonly {id: string}[],
  ) => {
    switch (table) {
      case 'issue':
        expect(
          rows.map(r => r.id),
          msg,
        ).toEqual(['iss-0']);
        break;
      case 'description':
        expect(
          rows.map(r => r.id),
          msg,
        ).toEqual(['iss-0']);
        break;
      case 'comment':
        expect(
          rows.map(r => r.id),
          msg,
        ).toEqual(['com-0']);
        break;
    }
  };

  const cases: TestCase[] = [
    [
      'Empty tables so no rows',
      {
        clientGroupID: nanoid(),
        cookieClientViewVersion: 0,
        excludeIds: [],
      },
      async () => {
        // empty
      },
      Object.fromEntries(syncedTables.map(t => [t, []])) as any,
    ],
    [
      'Base table has entries that do not exist in the CVR. These will be returned as creates',
      {
        clientGroupID: nanoid(),
        cookieClientViewVersion: 0,
        excludeIds: [],
      },
      async (executor, _args) => {
        const issue = makeIssue();
        const description = makeDescription();
        const comment = makeComment();
        await putIssue(executor, issue);
        await putDescription(executor, description);
        await createComment(executor, comment);
      },
      allCreated,
    ],
    [
      'Bas table and CVR have the same entries. Nothing returned as creates',
      {
        clientGroupID: nanoid(),
        cookieClientViewVersion: 1,
        excludeIds: [],
      },
      async (executor, args) => {
        await putIssue(executor, makeIssue());
        await putDescription(executor, makeDescription());
        await createComment(executor, makeComment());
        for (const table of syncedTables) {
          const rows = await findCreates(
            executor,
            table,
            args.clientGroupID,
            0,
            100,
          );
          await recordUpdates(executor, table, args.clientGroupID, 1, rows);
        }
      },
      Object.fromEntries(syncedTables.map(t => [t, []])) as any,
    ],
    [
      'Base table and CVR have the same entires but a 0 cookie is passed. Should return all rows as creates',
      {
        clientGroupID: nanoid(),
        cookieClientViewVersion: 0,
        excludeIds: [],
      },
      async (executor, args) => {
        await putIssue(executor, makeIssue());
        await putDescription(executor, makeDescription());
        await createComment(executor, makeComment());
        for (const table of syncedTables) {
          const rows = await findCreates(
            executor,
            table,
            args.clientGroupID,
            0,
            100,
          );
          await recordUpdates(executor, table, args.clientGroupID, 1, rows);
        }
      },
      allCreated,
    ],
    [
      'Base table has re-created entries. I.e., the CVR has them recorded as deletes',
      {
        clientGroupID: nanoid(),
        cookieClientViewVersion: 0,
        excludeIds: [],
      },
      async (executor, args) => {
        const issue = makeIssue();
        const description = makeDescription();
        const comment = makeComment();
        await putIssue(executor, issue);
        await putDescription(executor, description);
        await createComment(executor, comment);
        await recordDeletes(executor, 'issue', args.clientGroupID, 1, [
          issue.id,
        ]);
        await recordDeletes(executor, 'description', args.clientGroupID, 1, [
          description.id,
        ]);
        await recordDeletes(executor, 'comment', args.clientGroupID, 1, [
          comment.id,
        ]);
      },
      allCreated,
    ],
    [
      'Base table has entries that exist in the CVR at a different version. These will not be returned as they are updates',
      {
        clientGroupID: nanoid(),
        cookieClientViewVersion: 1,
        excludeIds: [],
      },
      async (executor, args) => {
        const issue = makeIssue();
        const desc = makeDescription();
        await putIssue(executor, issue);
        await putDescription(executor, desc);
        await createComment(executor, makeComment());
        for (const table of syncedTables) {
          const rows = await findCreates(
            executor,
            table,
            args.clientGroupID,
            0,
            100,
          );
          await recordUpdates(executor, table, args.clientGroupID, 1, rows);
        }
        await putIssue(executor, issue);
        await putDescription(executor, desc);
      },
      Object.fromEntries(syncedTables.map(t => [t, []])) as any,
    ],
  ];

  await makeCheckCases(
    cases,
    async (executor, table, args) =>
      await findCreates(
        executor,
        table,
        args.clientGroupID,
        args.cookieClientViewVersion,
        100,
      ),
  )();
});

async function clearTables(executor: Executor) {
  for (const table of syncedTables) {
    await executor(/*sql* / `DELETE FROM "${table}"`);
  }
  await executor(/*sql* / `DELETE FROM "client_view"`);
  await executor(/*sql* / `DELETE FROM "client_view_entry"`);
}
*/
