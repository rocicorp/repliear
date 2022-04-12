import type { JSONValue, ScanResult, WriteTransaction } from "replicache";
import { delEntry, getEntry, putEntries } from "./data";
import type { Executor } from "./pg";

/**
 * Implements Replicache's WriteTransaction interface in terms of a Postgres
 * transaction.
 */
export class ReplicacheTransaction implements WriteTransaction {
  private _spaceID: string;
  private _clientID: string;
  private _version: number;
  private _executor: Executor;
  private _cache: Map<
    string,
    { value: JSONValue | undefined; dirty: boolean }
  > = new Map();

  constructor(
    executor: Executor,
    spaceID: string,
    clientID: string,
    version: number
  ) {
    this._spaceID = spaceID;
    this._clientID = clientID;
    this._version = version;
    this._executor = executor;
  }

  get clientID(): string {
    return this._clientID;
  }

  async put(key: string, value: JSONValue): Promise<void> {
    this._cache.set(key, { value, dirty: true });
  }
  async del(key: string): Promise<boolean> {
    const had = await this.has(key);
    this._cache.set(key, { value: undefined, dirty: true });
    return had;
  }
  async get(key: string): Promise<JSONValue | undefined> {
    const entry = this._cache.get(key);
    if (entry) {
      return entry.value;
    }
    const value = await getEntry(this._executor, this._spaceID, key);
    this._cache.set(key, { value, dirty: false });
    return value;
  }
  async has(key: string): Promise<boolean> {
    const val = await this.get(key);
    return val !== undefined;
  }

  // TODO!
  async isEmpty(): Promise<boolean> {
    throw new Error("not implemented");
  }
  scan(): ScanResult<string> {
    throw new Error("not implemented");
  }
  scanAll(): Promise<[string, JSONValue][]> {
    throw new Error("not implemented");
  }

  async flush(): Promise<void> {
    const dirtyEntries = [...this._cache.entries()].filter(
      ([, { dirty }]) => dirty
    );
    const entriesToPut: [string, JSONValue][] = [];
    for (const dirtyEntry of dirtyEntries) {
      if (dirtyEntry[1].value !== undefined) {
        entriesToPut.push([dirtyEntry[0], dirtyEntry[1].value]);
      }
    }
    const entriesToDel = dirtyEntries.filter(
      ([, { value }]) => value === undefined
    );
    await Promise.all([
      ...entriesToDel.map(([k]) => {
        return delEntry(this._executor, this._spaceID, k, this._version);
      }),
      putEntries(this._executor, this._spaceID, entriesToPut, this._version),
    ]);
  }
}
