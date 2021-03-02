import { JSONValue } from "replicache";

/**
 * Interface required of underlying storage.
 */
export default interface Storage {
  getObject(key: string): Promise<JSONValue | undefined>;
  putObject(key: string, value: JSONValue): Promise<void>;
}
