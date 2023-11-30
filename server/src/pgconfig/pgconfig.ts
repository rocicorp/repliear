import type {Pool} from 'pg';
import type {Executor} from '../pg.js';
import {PostgresDBConfig} from './postgres.js';

export interface PGConfig {
  initPool(): Pool;
  getSchemaVersion(executor: Executor): Promise<number>;
}

export function getDBConfig(): PGConfig {
  const dbURL = process.env.DATABASE_URL;
  if (dbURL) {
    return new PostgresDBConfig(dbURL);
  }
  throw new Error(
    "PG Mem doesn't support all the operations require by repliear.",
  );
}
