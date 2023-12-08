import type {QueryResult} from 'pg';
import Database from 'better-sqlite3';
import AsyncLock from 'async-lock';
import {createDatabase} from '../schema';
export const lock = new AsyncLock();

export type Executor = (
  sql: string,
  params?: unknown[],
) => Promise<QueryResult>;
export type TransactionBodyFn<R> = (executor: Executor) => Promise<R>;

const conn = new Database(':memory:');
await createDatabase(executor, {
  initPool() {
    throw new Error('Not implemented');
  },
  async getSchemaVersion() {
    return 0;
  },
});

async function executor(sql: string, params?: unknown[]): Promise<QueryResult> {
  // sqlite doesn't support custom type creation. Just skip it.
  if (sql.toLowerCase().includes('create type ')) {
    return {command: '', oid: 0, fields: [], rowCount: 0, rows: []};
  }
  const stmt = conn.prepare(sql);
  const keyedParams = params?.reduce((acc, p, i) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (acc as any)[`${i + 1}`] = p;
    return acc;
  }, {} as Record<string, unknown>);
  // better-sqlite3 is dumb and requires us to call `run` if we don't return data vs `all` if we do.
  const method = sql.toLowerCase().includes('select ') ? 'all' : 'run';
  const rows = keyedParams ? stmt[method](keyedParams) : stmt[method]();
  return {
    command: '',
    oid: 0,
    fields: [],
    rowCount: Array.isArray(rows) ? rows.length : 0,
    rows: Array.isArray(rows) ? rows : [],
  };
}

export async function withExecutor<R>(
  f: (executor: Executor) => R,
): Promise<R> {
  return await f(executor);
}

export async function transact<R>(body: TransactionBodyFn<R>) {
  return await lock.acquire('transact', async () => {
    // better-sqlite3 is sync so async transactions aren't going to work as expected.
    // They'll commit once the first `await` is hit.
    // So we manually issue begin and commit.
    // We use a lock so concurrent transactions cannot interleave.
    // This'll deadlock if we ever update the code to issue nested transactions, however.
    // We'll fix that when that happens.
    conn.prepare('begin').run();
    try {
      const r = await body(executor);
      conn.prepare('commit').run();
      return r;
    } catch (e) {
      conn.prepare('rollback').run();
      throw e;
    }
  });
}
