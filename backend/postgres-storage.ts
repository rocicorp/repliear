import type { ReadonlyJSONValue } from "replicache";
import type { Storage } from "replicache-transaction";
import { putEntries, getEntry, delEntries } from "./data";
import type { Executor } from "./pg";

// Implements the Storage interface required by replicache-transaction in terms
// of our Postgres database.
export class PostgresStorage implements Storage {
  private _spaceID: string;
  private _version: number;
  private _executor: Executor;

  constructor(spaceID: string, version: number, executor: Executor) {
    this._spaceID = spaceID;
    this._version = version;
    this._executor = executor;
  }

  putEntry(key: string, value: ReadonlyJSONValue): Promise<void> {
    return putEntries(
      this._executor,
      this._spaceID,
      [[key, value]],
      this._version
    );
  }

  async hasEntry(key: string): Promise<boolean> {
    const v = await this.getEntry(key);
    return v !== undefined;
  }

  getEntry(key: string): Promise<ReadonlyJSONValue | undefined> {
    return getEntry(this._executor, this._spaceID, key);
  }

  getEntries(
    _fromKey: string
  ): AsyncIterable<readonly [string, ReadonlyJSONValue]> {
    throw new Error("not implemented");
  }

  delEntry(key: string): Promise<void> {
    return delEntries(this._executor, this._spaceID, [key], this._version);
  }
}
