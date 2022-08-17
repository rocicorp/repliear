import { atom, Getter, Setter } from "jotai";
import { atomWithHash } from "jotai/utils";
import { isEqual, partial, sortBy } from "lodash";
import type { ExperimentalDiff, ReadonlyJSONValue } from "replicache";
import {
  Issue,
  issueFromKeyAndValue,
  Order,
  orderEnumSchema,
  Priority,
  priorityEnumSchema,
  priorityOrderValues,
  reverseTimestampSortKey,
  Status,
  statusEnumSchema,
  statusOrderValues,
} from "./issue";

export const viewAtom = atomWithHash<string | null>("view", null);
export const priorityFilterAtom = atomWithHash<Priority[]>(
  "priorityFilter",
  [],
  {
    serialize: (value: Priority[]) => value.join(","),
    deserialize: (value: string) => value.split(",") as Priority[],
  }
);
export const statusFilterAtom = atomWithHash<Status[]>("statusFilter", [], {
  serialize: (value: Status[]) => value.join(","),
  deserialize: (value: string) => value.split(",") as Status[],
});
export const orderByAtom = atomWithHash("orderBy", Order.MODIFIED);
export const detailIssueIDAtom = atomWithHash<string | null>("iss", null);

// analagous to the previous reducer state
export const issueOrderAtom = atom((get) =>
  getIssueOrder(get(viewAtom), get(orderByAtom))
);

export const filtersAtom = atom(
  (get) =>
    new Filters(get(viewAtom), get(priorityFilterAtom), get(statusFilterAtom))
);
export const allIssuesMapAtom = atom<Map<string, Issue>>(new Map());

export const viewIssueCountAtom = atom((get) => {
  let count = 0;
  for (const issue of get(allIssuesMapAtom).values()) {
    if (get(filtersAtom).viewFilter(issue)) {
      count++;
    }
  }
  return count;
});

// filtered, but unsorted
export const unsortedIssuesAtom = atom((get) => {
  const issues = Array.from(get(allIssuesMapAtom).values());
  const filters = get(filtersAtom);
  return issues.filter((i) => filters.viewFilter(i) && filters.issuesFilter(i));
});

export const filteredIssuesAtom = atom((get) => {
  const issueOrder = get(issueOrderAtom);

  const orderIteratee = partial(getOrderValue, issueOrder);
  return sortBy(get(unsortedIssuesAtom), orderIteratee);
});

class Filters {
  private readonly _viewStatuses: Set<Status> | undefined;
  private readonly _issuesStatuses: Set<Status> | undefined;
  private readonly _issuesPriorities: Set<Priority> | undefined;
  readonly hasNonViewFilters: boolean;
  constructor(
    view: string | null,
    priorityFilter: string[] | null,
    statusFilter: string[] | null
  ) {
    this._viewStatuses = undefined;
    switch (view?.toLowerCase()) {
      case "active":
        this._viewStatuses = new Set([Status.IN_PROGRESS, Status.TODO]);
        break;
      case "backlog":
        this._viewStatuses = new Set([Status.BACKLOG]);
        break;
      default:
        this._viewStatuses = undefined;
    }

    this._issuesStatuses = undefined;
    this._issuesPriorities = undefined;
    this.hasNonViewFilters = false;
    if (statusFilter) {
      this._issuesStatuses = new Set<Status>();
      for (const s of statusFilter) {
        const parseResult = statusEnumSchema.safeParse(s);
        if (
          parseResult.success &&
          (!this._viewStatuses || this._viewStatuses.has(parseResult.data))
        ) {
          this.hasNonViewFilters = true;
          this._issuesStatuses.add(parseResult.data);
        }
      }
    }
    if (!this.hasNonViewFilters) {
      this._issuesStatuses = this._viewStatuses;
    }

    if (priorityFilter) {
      this._issuesPriorities = new Set<Priority>();
      for (const p of priorityFilter) {
        const parseResult = priorityEnumSchema.safeParse(p);
        if (parseResult.success) {
          this.hasNonViewFilters = true;
          this._issuesPriorities.add(parseResult.data);
        }
      }
      if (this._issuesPriorities.size === 0) {
        this._issuesPriorities = undefined;
      }
    }
  }

  viewFilter(issue: Issue): boolean {
    return this._viewStatuses ? this._viewStatuses.has(issue.status) : true;
  }

  issuesFilter(issue: Issue): boolean {
    if (this._issuesStatuses) {
      if (!this._issuesStatuses.has(issue.status)) {
        return false;
      }
    }
    if (this._issuesPriorities) {
      if (!this._issuesPriorities.has(issue.priority)) {
        return false;
      }
    }
    return true;
  }

  equals(other: Filters): boolean {
    return (
      this === other ||
      (isEqual(this._viewStatuses, other._viewStatuses) &&
        isEqual(this._issuesStatuses, other._issuesStatuses) &&
        isEqual(this._issuesPriorities, other._issuesPriorities) &&
        isEqual(this.hasNonViewFilters, other.hasNonViewFilters))
    );
  }
}

function getIssueOrder(view: string | null, orderBy: string | null): Order {
  if (view === "board") {
    return Order.KANBAN;
  }
  const parseResult = orderEnumSchema.safeParse(orderBy);
  return parseResult.success ? parseResult.data : Order.MODIFIED;
}

function getOrderValue(issueOrder: Order, issue: Issue): string {
  let orderValue: string;
  switch (issueOrder) {
    case Order.CREATED:
      orderValue = reverseTimestampSortKey(issue.created, issue.id);
      break;
    case Order.MODIFIED:
      orderValue = reverseTimestampSortKey(issue.modified, issue.id);
      break;
    case Order.STATUS:
      orderValue =
        statusOrderValues[issue.status] +
        "-" +
        reverseTimestampSortKey(issue.modified, issue.id);
      break;
    case Order.PRIORITY:
      orderValue =
        priorityOrderValues[issue.priority] +
        "-" +
        reverseTimestampSortKey(issue.modified, issue.id);
      break;
    case Order.KANBAN:
      orderValue = issue.kanbanOrder + "-" + issue.id;
      break;
  }
  return orderValue;
}

export const processDiffAtom = atom(
  null,
  (get: Getter, set: Setter, diff: ExperimentalDiff) => {
    if (diff.length === 0) {
      return;
    }

    const newAllIssuesMap = new Map(get(allIssuesMapAtom));

    function add(key: string, newValue: ReadonlyJSONValue) {
      const newIssue = issueFromKeyAndValue(key, newValue);
      newAllIssuesMap.set(key, newIssue);
    }

    function del(key: string, _oldValue: ReadonlyJSONValue) {
      newAllIssuesMap.delete(key);
    }

    for (const diffOp of diff) {
      switch (diffOp.op) {
        case "add": {
          add(diffOp.key as string, diffOp.newValue);
          break;
        }
        case "del": {
          del(diffOp.key as string, diffOp.oldValue);
          break;
        }
        case "change": {
          del(diffOp.key as string, diffOp.oldValue);
          add(diffOp.key as string, diffOp.newValue);
          break;
        }
      }
    }
    set(allIssuesMapAtom, newAllIssuesMap);
  }
);
