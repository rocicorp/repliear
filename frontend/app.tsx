import React, { useCallback, useEffect, useReducer } from "react";
import type {
  ExperimentalDiff as Diff,
  ReadTransaction,
  Replicache,
} from "replicache";
import LeftMenu from "./left-menu";
import type { M } from "./mutators";
import {
  Issue,
  issueFromKeyAndValue,
  ISSUE_KEY_PREFIX,
  IssueValue,
  Order,
  orderEnumSchema,
  Priority,
  priorityEnumSchema,
  Status,
  statusEnumSchema,
  Description,
  Comment,
  IssueUpdate,
  reverseTimestampSortKey,
  statusOrderValues,
  priorityOrderValues,
} from "./issue";
import { useState } from "react";
import TopFilter from "./top-filter";
import IssueList from "./issue-list";
import { useQueryState } from "next-usequerystate";
import IssueBoard from "./issue-board";
import { isEqual, minBy, sortBy, sortedIndexBy } from "lodash";
import IssueDetail from "./issue-detail";
import { generateKeyBetween } from "fractional-indexing";
import { useSubscribe } from "replicache-react";

class Filters {
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

function getFilters(
  view: string | null,
  priorityFilter: string | null,
  statusFilter: string | null
): Filters {
  return new Filters(view, priorityFilter, statusFilter);
}

function getIssueOrder(view: string | null, orderBy: string | null): Order {
  if (view === "board") {
    return Order.KANBAN;
  }
  const parseResult = orderEnumSchema.safeParse(orderBy);
  return parseResult.success ? parseResult.data : Order.MODIFIED;
}

function getTitle(view: string | null) {
  switch (view?.toLowerCase()) {
    case "active":
      return "Active issues";
    case "backlog":
      return "Backlog issues";
    case "board":
      return "Board";
    default:
      return "All issues";
  }
}

type State = {
  allIssuesMap: Map<string, Issue>;
  viewIssueCount: number;
  filteredIssues: Issue[];
  filters: Filters;
  issueOrder: Order;
};
function timedReducer(
  state: State,
  action:
    | {
        type: "diff";
        diff: Diff;
      }
    | {
        type: "setFilters";
        filters: Filters;
      }
    | {
        type: "setIssueOrder";
        issueOrder: Order;
      }
): State {
  const start = Date.now();
  const result = reducer(state, action);
  console.log(`Reducer took ${Date.now() - start}ms`, action);
  return result;
}

function reducer(
  state: State,
  action:
    | {
        type: "diff";
        diff: Diff;
      }
    | {
        type: "setFilters";
        filters: Filters;
      }
    | {
        type: "setIssueOrder";
        issueOrder: Order;
      }
): State {
  const filters = action.type === "setFilters" ? action.filters : state.filters;
  const issueOrder =
    action.type === "setIssueOrder" ? action.issueOrder : state.issueOrder;

  function order(issue: Issue): string {
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
  function filterAndSort(issues: Issue[]): Issue[] {
    return sortBy(
      issues.filter((issue) => filters.issuesFilter(issue)),
      order
    );
  }
  function countViewIssues(issues: Issue[]): number {
    let count = 0;
    for (const issue of issues) {
      if (filters.viewFilter(issue)) {
        count++;
      }
    }
    return count;
  }

  switch (action.type) {
    case "diff": {
      if (action.diff.length === 0) {
        return state;
      }
      const newAllIssuesMap = new Map(state.allIssuesMap);
      let newViewIssueCount = state.viewIssueCount;
      const newFilteredIssues = [...state.filteredIssues];
      for (const diffOp of action.diff) {
        switch (diffOp.op) {
          case "add": {
            const newIssue = issueFromKeyAndValue(diffOp.key, diffOp.newValue);
            newAllIssuesMap.set(diffOp.key, newIssue);
            if (filters.viewFilter(newIssue)) {
              newViewIssueCount++;
            }
            if (filters.issuesFilter(newIssue)) {
              newFilteredIssues.splice(
                sortedIndexBy(newFilteredIssues, newIssue, order),
                0,
                newIssue
              );
            }

            break;
          }
          case "del": {
            const oldIssue = issueFromKeyAndValue(diffOp.key, diffOp.oldValue);
            const index = sortedIndexBy(newFilteredIssues, oldIssue, order);
            newAllIssuesMap.delete(diffOp.key);
            if (filters.viewFilter(oldIssue)) {
              newViewIssueCount--;
            }
            if (newFilteredIssues[index]?.id === oldIssue.id) {
              newFilteredIssues.splice(index, 1);
            }
            break;
          }
          case "change": {
            const oldIssue = issueFromKeyAndValue(diffOp.key, diffOp.oldValue);
            const index = sortedIndexBy(newFilteredIssues, oldIssue, order);
            if (filters.viewFilter(oldIssue)) {
              newViewIssueCount--;
            }
            if (newFilteredIssues[index]?.id === oldIssue.id) {
              newFilteredIssues.splice(index, 1);
            }
            const newIssue = issueFromKeyAndValue(diffOp.key, diffOp.newValue);
            newAllIssuesMap.set(diffOp.key, newIssue);
            if (filters.viewFilter(newIssue)) {
              newViewIssueCount++;
            }
            if (filters.issuesFilter(newIssue)) {
              newFilteredIssues.splice(
                sortedIndexBy(newFilteredIssues, newIssue, order),
                0,
                newIssue
              );
            }
            break;
          }
        }
      }
      return {
        ...state,
        allIssuesMap: newAllIssuesMap,
        viewIssueCount: newViewIssueCount,
        filteredIssues: newFilteredIssues,
      };
    }
    case "setFilters": {
      if (action.filters.equals(state.filters)) {
        return state;
      }
      const allIssues = [...state.allIssuesMap.values()];
      return {
        ...state,
        viewIssueCount: countViewIssues(allIssues),
        filters: action.filters,
        filteredIssues: filterAndSort(allIssues),
      };
    }
    case "setIssueOrder": {
      if (action.issueOrder === state.issueOrder) {
        return state;
      }
      return {
        ...state,
        filteredIssues: sortBy(state.filteredIssues, order),
        issueOrder: action.issueOrder,
      };
    }
  }

  return state;
}

interface LayoutProps {
  view: string | null;
  detailIssueID: string | null;
  isLoading: boolean;
  state: State;
  rep: Replicache<M>;
  onUpdateIssues: (issueUpdates: IssueUpdate[]) => void;
  onCreateComment: (comment: Comment) => void;
}

const MainContent = ({
  view,
  detailIssueID,
  isLoading,
  state,
  rep,
  onUpdateIssues,
  onCreateComment,
}: LayoutProps) => {
  if (detailIssueID) {
    return (
      <IssueDetail
        issues={state.filteredIssues}
        rep={rep}
        onUpdateIssues={onUpdateIssues}
        onAddComment={onCreateComment}
        isLoading={isLoading}
      />
    );
  }
  if (view === "board") {
    return (
      <IssueBoard
        issues={state.filteredIssues}
        onUpdateIssues={onUpdateIssues}
      />
    );
  }
  return (
    <IssueList
      issues={state.filteredIssues}
      onUpdateIssues={onUpdateIssues}
      view={view}
    />
  );
};

const App = ({ rep }: { rep: Replicache<M> }) => {
  const [view] = useQueryState("view");
  const [priorityFilter] = useQueryState("priorityFilter");
  const [statusFilter] = useQueryState("statusFilter");
  const [orderBy] = useQueryState("orderBy");
  const [detailIssueID] = useQueryState("iss");
  const [menuVisible, setMenuVisible] = useState(false);

  const [state, dispatch] = useReducer(timedReducer, {
    allIssuesMap: new Map(),
    viewIssueCount: 0,
    filteredIssues: [],
    filters: getFilters(view, priorityFilter, statusFilter),
    issueOrder: getIssueOrder(view, orderBy),
  });

  const partialSyncDefault = { endKey: "PARTIAL_SYNC_SENTINEL" };
  const partialSync = useSubscribe(
    rep,
    async (tx: ReadTransaction) => {
      return (
        ((await tx.get("control/partialSync")) as { endKey?: string }) ||
        partialSyncDefault
      );
    },
    partialSyncDefault
  );

  const partialSyncComplete = partialSync.endKey === undefined;
  useEffect(() => {
    if (!partialSyncComplete) {
      rep.pull();
    }
  }, [rep, partialSync, partialSyncComplete]);

  useEffect(() => {
    rep.experimentalWatch(
      (diff) => {
        dispatch({
          type: "diff",
          diff,
        });
      },
      { prefix: ISSUE_KEY_PREFIX, initialValuesInFirstDiff: true }
    );
  }, [rep]);

  useEffect(() => {
    dispatch({
      type: "setFilters",
      filters: getFilters(view, priorityFilter, statusFilter),
    });
  }, [view, priorityFilter, statusFilter]);

  useEffect(() => {
    dispatch({
      type: "setIssueOrder",
      issueOrder: getIssueOrder(view, orderBy),
    });
  }, [view, orderBy]);

  const handleCreateIssue = useCallback(
    async (issue: Omit<Issue, "kanbanOrder">, description: Description) => {
      const minKanbanOrderIssue = minBy(
        [...state.allIssuesMap.values()],
        (issue) => issue.kanbanOrder
      );
      const minKanbanOrder = minKanbanOrderIssue
        ? minKanbanOrderIssue.kanbanOrder
        : null;
      await rep.mutate.putIssue({
        issue: {
          ...issue,
          kanbanOrder: generateKeyBetween(null, minKanbanOrder),
        },
        description,
      });
    },
    [rep, state.allIssuesMap]
  );
  const handleCreateComment = useCallback(
    (comment: Comment) => rep.mutate.putIssueComment(comment),
    [rep]
  );
  const handleUpdateIssues = useCallback(
    async (
      issueUpdates: {
        id: string;
        changes: Partial<IssueValue>;
        description?: Description;
      }[]
    ) => {
      await rep.mutate.updateIssues(issueUpdates);
    },
    [rep]
  );

  return (
    <div>
      <div className="flex w-full h-screen overflow-y-hidden">
        <LeftMenu
          menuVisible={menuVisible}
          onCloseMenu={() => setMenuVisible(false)}
          onCreateIssue={handleCreateIssue}
        />
        <div className="flex flex-col flex-grow min-w-0">
          {detailIssueID === null && (
            <TopFilter
              onToggleMenu={() => setMenuVisible(!menuVisible)}
              title={getTitle(view)}
              filteredIssuesCount={
                state.filters.hasNonViewFilters
                  ? state.filteredIssues.length
                  : undefined
              }
              issuesCount={state.viewIssueCount}
              showSortOrderMenu={view !== "board"}
            />
          )}
          <MainContent
            view={view}
            detailIssueID={detailIssueID}
            isLoading={!partialSyncComplete}
            state={state}
            rep={rep}
            onUpdateIssues={handleUpdateIssues}
            onCreateComment={handleCreateComment}
          />
        </div>
      </div>
    </div>
  );
};

export default App;
