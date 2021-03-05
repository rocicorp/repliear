import { JSONValue } from "replicache";

/**
 * Interface required of underlying storage.
 */
export interface ReadStorage {
  getObject(key: string): Promise<JSONValue | undefined>;
}

export interface WriteStorage extends ReadStorage {
  putObject(key: string, value: JSONValue): Promise<void>;
  delObject(key: string): Promise<void>;
}
