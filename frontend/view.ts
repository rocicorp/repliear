import { sortBy } from "lodash";
import type {
  ExperimentalDiff as Diff,
  ReadonlyJSONValue,
  Replicache,
} from "replicache";

type EntryKey = string;

export type Entry<T> = {
  // TODO: parameterize key to support indexes
  key: EntryKey;
  value: T;
};

export type ViewFilter<T> = (entry: T) => boolean;
export type SortBy<T> = (entry: T) => number | string;
export type OnChange<T> = (values: T[]) => void;

// Note: this is a long way of saying that the WatchOptions are the same as
// the ScanOptions but with the extension of WatchOptionsExt below. I think
// there is a refactor possible to clean this up, I can talk about that
// separately.
export type ViewOptions<T> = {
  prefix?: string;
  filter?: ViewFilter<T>;
  sortBy?: SortBy<T>;
  onChange?: OnChange<T>;
  // onRaw?: (changes: WatchChange[]),
};

export class View<T extends ReadonlyJSONValue> {
  private _rep: Replicache;
  private _filter: ViewFilter<T> | undefined;
  private _sortBy: SortBy<T> | undefined;
  private _onChange: OnChange<T> | undefined;
  private _raw: Map<EntryKey, Entry<T>>;
  private _result: T[];

  constructor(rep: Replicache, options: ViewOptions<T>) {
    this._rep = rep;
    this._raw = new Map();
    this._result = [];

    this._filter = options.filter;
    this._sortBy = options.sortBy;
    this._onChange = options.onChange;

    this._rep.experimentalWatch((diff) => this._processDiff(diff), {
      prefix: options.prefix,

      // TODO: support incremental updates, this has to go into options
      initialValuesInFirstDiff: true,
    });
  }

  get sortBy(): SortBy<T> | undefined {
    return this._sortBy;
  }

  set sortBy(sortBy: SortBy<T> | undefined) {
    this._sortBy = sortBy;
    this._update();
  }

  get filter(): ViewFilter<T> | undefined {
    return this._filter;
  }

  set filter(filter: ViewFilter<T> | undefined) {
    this._filter = filter;
    this._update();
  }

  private _processDiff(diff: Diff) {
    for (const diffOp of diff) {
      switch (diffOp.op) {
        case "add": {
          this._add(diffOp.key as string, diffOp.newValue as T);
          break;
        }
        case "del": {
          this._del(diffOp.key as string);
          break;
        }
        case "change": {
          this._del(diffOp.key as string);
          this._add(diffOp.key as string, diffOp.newValue as T);
          break;
        }
      }
    }

    this._update();
  }

  private _add(key: string, value: T) {
    // TODO: insert into sorted array
    this._raw.set(key, { key, value });
  }

  private _del(key: string) {
    this._raw.delete(key);
  }

  private _update() {
    this._result = [];

    for (const { value } of this._raw.values()) {
      if (this._filter) {
        if (this._filter(value)) {
          this._result.push(value);
        }
      } else {
        this._result.push(value);
      }
    }

    if (this._sortBy) {
      this._result = sortBy(this._result, this._sortBy);
    }

    if (this._onChange) {
      this._onChange(this._result);
    }
  }
}

export function createView<T>(
  rep: Replicache,
  options: ViewOptions<T>
): View<T> {
  return new View<T>(rep, options);
}

// type Unwatch = () => void;

// type WatchChange = {
// 	at: number,
// 	delete: number,
// 	insert: Entry[],
// };
