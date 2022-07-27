import type {
  ExperimentalDiff as Diff,
  ReadonlyJSONValue,
  Replicache,
} from "replicache";

type Entry = {
  key: string;
  value: ReadonlyJSONValue;
};

// Note: this is a long way of saying that the WatchOptions are the same as
// the ScanOptions but with the extension of WatchOptionsExt below. I think
// there is a refactor possible to clean this up, I can talk about that
// separately.
type LensOptions = {
  prefix?: string;
  filter?: (entry: Entry) => boolean;
  sort?: (a: Entry, b: Entry) => number;
  onChange?: (result: Entry[]) => void;
  // onRaw?: (changes: WatchChange[]),
};

class Lens {
  private rep: Replicache;
  private options: LensOptions;
  private onChange: ((result: Entry[]) => void) | undefined;
  private filter: (entry: Entry) => boolean;
  private sort: ((a: Entry, b: Entry) => number) | undefined;

  private raw: Map<string, Entry>;
  private result: Entry[];

  constructor(rep: Replicache, options: LensOptions) {
    this.rep = rep;
    this.options = options;
    this.onChange = options.onChange;
    this.sort = options.sort;
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
          this.add(diffOp.key as string, diffOp.newValue);
          break;
        }
        case "del": {
          this.del(diffOp.key as string);
          break;
        }
        case "change": {
          this.del(diffOp.key as string);
          this.add(diffOp.key as string, diffOp.newValue);
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

  add(key: string, value: ReadonlyJSONValue) {
    this.raw.set(key, { key, value });
  }

  del(key: string) {
    this.raw.delete(key as string);
  }

  doFilter() {
    // TODO: early out
    const filtered: Entry[] = [];

    for (const entry of this.raw.values()) {
      if (this.filter(entry)) {
        filtered.push(entry);
      }
    }

    this.result = filtered;
  }

  doSort() {
    // TODO: early out
    // TODO: does this preserve reference equality?
    // TODO: insert into sorted array instead of sorting entire thing
    if (this.sort) {
      this.result.sort(this.sort);
    }
  }
}

const lenses = new Set<Lens>();

export function createLens(rep: Replicache, options: LensOptions): Unwatch {
  lenses.add(new Lens(rep, options));

  return () => {
    throw new Error("Not implemented");
  };
}

type Unwatch = () => void;

// type WatchChange = {
// 	at: number,
// 	delete: number,
// 	insert: Entry[],
// };
