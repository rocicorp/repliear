import { atom, WritableAtom } from "jotai";
import { atomFamily } from "jotai/utils";
import { isEqual, partial, sortBy, sortedIndexBy } from "lodash";
import type { ExperimentalDiff, ReadonlyJSONValue } from "replicache";
import {
  Comment,
  commentIDs,
  Description,
  DESCRIPTION_KEY_PREFIX,
  Issue,
  issueFromKeyAndValue,
  Order,
  Priority,
  priorityEnumSchema,
  priorityOrderValues,
  reverseTimestampSortKey,
  Status,
  statusEnumSchema,
  statusOrderValues,
} from "./issue";

export class Filters {
  private readonly _viewStatuses: Set<Status> | undefined;
  private readonly _issuesStatuses: Set<Status> | undefined;
  private readonly _issuesPriorities: Set<Priority> | undefined;
  readonly hasNonViewFilters: boolean;
  constructor(
    view: string | null,
    priorityFilter: string | null,
    statusFilter: string | null
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
      for (const s of statusFilter.split(",")) {
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
      for (const p of priorityFilter.split(",")) {
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

export const allIssuesMapAtom = atom<Map<string, Issue>>(new Map());
export const allIssuesAtomFamily = atomFamily(() => atom({} as Issue));
export const viewIssueCountAtom = atom(0);

const rawDisplayedIssuesAtom = atom<Issue[]>([]);
export const displayedIssuesAtom = atom((get) => get(rawDisplayedIssuesAtom));

// filters
const rawFiltersAtom = atom<Filters>(new Filters(null, null, null));
export const filtersAtom = atom(
  (get) => get(rawFiltersAtom),
  (_, set, filters: Filters) => {
    set(rawFiltersAtom, filters);
    set(refreshDisplayIssuesAtom);
  }
);

// order
const rawIssueOrderAtom = atom<Order>(Order.MODIFIED);
export const issueOrderAtom = atom(
  (get) => get(rawIssueOrderAtom),
  (get, set, order: Order) => {
    if (order === get(rawIssueOrderAtom)) {
      return;
    }
    set(rawIssueOrderAtom, order);
    set(
      rawDisplayedIssuesAtom,
      sortBy(get(rawDisplayedIssuesAtom), partial(getOrderValue, order))
    );
  }
);

export const issueDiffHandlerAtom = atom<null, ExperimentalDiff>(
  null,
  (get, set, diff) => {
    if (diff.length === 0) {
      return;
    }
    const start = Date.now();
    const newAllIssuesMap = get(allIssuesMapAtom);
    let newViewIssueCount = get(viewIssueCountAtom);
    const newFilteredIssues = [...get(rawDisplayedIssuesAtom)];
    const orderIteratee = partial(getOrderValue, get(rawIssueOrderAtom));
    const filters = get(rawFiltersAtom);

    function add(key: string, newValue: ReadonlyJSONValue) {
      const newIssue = issueFromKeyAndValue(key, newValue);
      newAllIssuesMap.set(key, newIssue);
      if (filters.viewFilter(newIssue)) {
        newViewIssueCount++;
      }
      if (filters.issuesFilter(newIssue)) {
        newFilteredIssues.splice(
          sortedIndexBy(newFilteredIssues, newIssue, orderIteratee),
          0,
          newIssue
        );
      }
      set(allIssuesAtomFamily(newIssue.id), newIssue);
    }
    function del(key: string, oldValue: ReadonlyJSONValue) {
      const oldIssue = issueFromKeyAndValue(key, oldValue);
      const index = sortedIndexBy(newFilteredIssues, oldIssue, orderIteratee);
      newAllIssuesMap.delete(key);
      if (filters.viewFilter(oldIssue)) {
        newViewIssueCount--;
      }
      if (newFilteredIssues[index]?.id === oldIssue.id) {
        newFilteredIssues.splice(index, 1);
      }
      allIssuesAtomFamily.remove(oldIssue.id);
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
    set(viewIssueCountAtom, newViewIssueCount);
    set(rawDisplayedIssuesAtom, newFilteredIssues);
    console.log(`Diff Handler took ${Date.now() - start}ms`);
  }
);

const refreshDisplayIssuesAtom = atom(null, (get, set) => {
  const allIssues = [...get(allIssuesMapAtom).values()];
  const orderIteratee = partial(getOrderValue, get(rawIssueOrderAtom));
  const filters = get(rawFiltersAtom);
  set(viewIssueCountAtom, countViewIssues(allIssues, filters));
  set(rawDisplayedIssuesAtom, filterAndSort(allIssues, filters, orderIteratee));
});

function countViewIssues(issues: Issue[], filters: Filters): number {
  let count = 0;
  for (const issue of issues) {
    if (filters.viewFilter(issue)) {
      count++;
    }
  }
  return count;
}

function filterAndSort(
  issues: Issue[],
  filters: Filters,
  orderIteratee: (i: Issue) => string
): Issue[] {
  return sortBy(
    issues.filter((issue) => filters.issuesFilter(issue)),
    orderIteratee
  );
}

export function getOrderValue(issueOrder: Order, issue: Issue): string {
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

export const descriptionFamilyAtom = atomFamily(() => atom("DEFAULT"));

export const descriptionDiffHandlerAtom = atom<null, ExperimentalDiff>(
  null,
  (_, set, diff) => {
    for (const diffOp of diff) {
      const issueId = (diffOp.key as string).substring(
        DESCRIPTION_KEY_PREFIX.length
      );
      switch (diffOp.op) {
        case "add":
        case "change": {
          set(descriptionFamilyAtom(issueId), diffOp.newValue as Description);
          break;
        }
        case "del": {
          descriptionFamilyAtom.remove(issueId);
          break;
        }
      }
    }
  }
);

export const issueCommentsAtomsFamily = atomFamily(() =>
  atom<WritableAtom<Comment, Comment>[]>([])
);
export const commentDiffHandlerAtom = atom<null, ExperimentalDiff>(
  null,
  (get, set, diff) => {
    for (const diffOp of diff) {
      const { issueID, commentID } = commentIDs(diffOp.key as string);
      const issueCommentsAtom = issueCommentsAtomsFamily(issueID);
      switch (diffOp.op) {
        case "add": {
          const newComments = [
            ...get(issueCommentsAtom),
            atom(diffOp.newValue as Comment),
          ];
          newComments.sort((a, b) => get(a).created - get(b).created);
          set(issueCommentsAtom, newComments);
          break;
        }
        case "del":
          set(
            issueCommentsAtom,
            get(issueCommentsAtom).filter(
              (comment) => get(comment).id !== commentID
            )
          );
          break;
        case "change": {
          for (const commentAtom of get(issueCommentsAtom)) {
            if (get(commentAtom).id === commentID) {
              set(commentAtom, diffOp.newValue as Comment);
            }
          }
          break;
        }
      }
    }
  }
);
