import { JSONValue, ReadonlyJSONValue } from "replicache";

/**
 * Interface required of underlying storage.
 */
export interface ReadStorage {
  getObject(key: string): Promise<ReadonlyJSONValue | undefined>;
}

export interface WriteStorage extends ReadStorage {
  putObject(key: string, value: JSONValue): Promise<void>;
  delObject(key: string): Promise<void>;
}
