import { sortBy } from "lodash";
import type {
  ExperimentalDiff as Diff,
  ReadonlyJSONValue,
  Replicache,
} from "replicache";

export type Entry<T> = {
  key: string;
  value: T;
};

// Note: this is a long way of saying that the WatchOptions are the same as
// the ScanOptions but with the extension of WatchOptionsExt below. I think
// there is a refactor possible to clean this up, I can talk about that
// separately.
export type LensOptions<T> = {
  prefix?: string;
  filter?: (entry: T) => boolean;
  sortBy?: (entry: ReadonlyJSONValue) => number | string;
  onChange?: (result: ReadonlyJSONValue[]) => void;
  // onRaw?: (changes: WatchChange[]),
};

export class Lens<T extends ReadonlyJSONValue> {
  private rep: Replicache;
  private options: LensOptions<T>;
  private onChange: ((result: T[]) => void) | undefined;
  private filter: (entry: T) => boolean;
  private sortBy: ((entry: T) => number | string) | undefined;

  private raw: Map<string, T>;
  private result: T[];

  constructor(rep: Replicache, options: LensOptions<T>) {
    this.rep = rep;
    this.options = options;
    this.onChange = options.onChange;
    this.sortBy = options.sortBy;
    this.filter = options.filter || (() => true);
    this.raw = new Map();
    this.result = [];

    this.rep.experimentalWatch((diff) => this.processDiff(diff), {
      prefix: this.options.prefix,
      initialValuesInFirstDiff: true,
    });
  }

  processDiff(diff: Diff) {
    // do adds, deletes, and changes
    for (const diffOp of diff) {
      switch (diffOp.op) {
        case "add": {
          this.add(diffOp.key as string, diffOp.newValue as T);
          break;
        }
        case "del": {
          this.del(diffOp.key as string);
          break;
        }
        case "change": {
          this.del(diffOp.key as string);
          this.add(diffOp.key as string, diffOp.newValue as T);
          break;
        }
      }
    }

    this.doFilter();
    this.doSort();

    if (this.onChange) {
      this.onChange(this.result);
    }
  }

  add(key: string, value: T) {
    this.raw.set(key, value);
  }

  del(key: string) {
    this.raw.delete(key as string);
  }

  setFilter(filter: (entry: T) => boolean) {
    this.filter = filter;
    this.doFilter();
    this.doSort();
    if (this.onChange) {
      this.onChange(this.result);
    }
  }

  setSortBy(sortBy: (entry: T) => number | string) {
    this.sortBy = sortBy;
    this.doSort();
    if (this.onChange) {
      this.onChange(this.result);
    }
  }

  doFilter() {
    const filtered: T[] = [];

    for (const o of this.raw.values()) {
      if (this.filter(o)) {
        filtered.push(o);
      }
    }

    this.result = filtered;
  }

  doSort() {
    // TODO: early out
    // TODO: does this preserve reference equality?
    // TODO: insert into sorted array instead of sorting entire thing
    if (this.sortBy) {
      this.result = sortBy(this.result, this.sortBy);
    }
  }
}

export function createLens<T>(
  rep: Replicache,
  options: LensOptions<T>
): Lens<T> {
  return new Lens<T>(rep, options);
}

// type Unwatch = () => void;

// type WatchChange = {
// 	at: number,
// 	delete: number,
// 	insert: Entry[],
// };
