import React, { useCallback, useEffect, useReducer } from "react";
import type { ExperimentalDiff as Diff, Replicache } from "replicache";
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
import { minBy, sortBy, sortedIndexBy } from "lodash";
import IssueDetail from "./issue-detail";
import { generateKeyBetween } from "fractional-indexing";

type Filters = {
  readonly viewFilter: (issue: Issue) => boolean;
  readonly issuesFilter: (issue: Issue) => boolean;
  readonly hasNonViewFilters: boolean;
};

function getFilters(
  view: string | null,
  priorityFilter: string | null,
  statusFilter: string | null
): Filters {
  let viewStatuses: Set<Status> | undefined = undefined;
  switch (view?.toLowerCase()) {
    case "active":
      viewStatuses = new Set([Status.IN_PROGRESS, Status.TODO]);
      break;
    case "backlog":
      viewStatuses = new Set([Status.BACKLOG]);
      break;
    default:
      viewStatuses = undefined;
  }

  let issuesStatuses: Set<Status> | undefined = undefined;
  let issuesPriorities: Set<Priority> | undefined = undefined;
  let hasNonViewFilters = false;
  if (statusFilter) {
    issuesStatuses = new Set<Status>();
    for (const s of statusFilter.split(",")) {
      const parseResult = statusEnumSchema.safeParse(s);
      if (
        parseResult.success &&
        (!viewStatuses || viewStatuses.has(parseResult.data))
      ) {
        hasNonViewFilters = true;
        issuesStatuses.add(parseResult.data);
      }
    }
  }
  if (!hasNonViewFilters) {
    issuesStatuses = viewStatuses;
  }

  if (priorityFilter) {
    issuesPriorities = new Set<Priority>();
    for (const p of priorityFilter.split(",")) {
      const parseResult = priorityEnumSchema.safeParse(p);
      if (parseResult.success) {
        hasNonViewFilters = true;
        issuesPriorities.add(parseResult.data);
      }
    }
    if (issuesPriorities.size === 0) {
      issuesPriorities = undefined;
    }
  }
  return {
    viewFilter: (issue: Issue) => {
      return viewStatuses ? viewStatuses.has(issue.status) : true;
    },
    issuesFilter: (issue: Issue) => {
      if (issuesStatuses) {
        if (!issuesStatuses.has(issue.status)) {
          return false;
        }
      }
      if (issuesPriorities) {
        if (!issuesPriorities.has(issue.priority)) {
          return false;
        }
      }
      return true;
    },
    hasNonViewFilters,
  };
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
    return sortBy(issues.filter(filters.issuesFilter), order);
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
      const allIssues = [...state.allIssuesMap.values()];
      return {
        ...state,
        viewIssueCount: countViewIssues(allIssues),
        filters: action.filters,
        filteredIssues: filterAndSort(allIssues),
      };
    }
    case "setIssueOrder": {
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
  state: State;
  rep: Replicache<M>;
  onUpdateIssues: (issueUpdates: IssueUpdate[]) => void;
  onCreateComment: (comment: Comment) => void;
}

const Layout = ({
  view,
  state,
  rep,
  onUpdateIssues,
  onCreateComment,
}: LayoutProps) => {
  switch (view) {
    case "board":
      return (
        <IssueBoard
          issues={state.filteredIssues}
          onUpdateIssues={onUpdateIssues}
        />
      );
    case "detail":
      return (
        <IssueDetail
          issues={state.filteredIssues}
          rep={rep}
          onUpdateIssues={onUpdateIssues}
          onAddComment={onCreateComment}
          isLoading={false}
        />
      );
    default:
      return (
        <IssueList
          issues={state.filteredIssues}
          onUpdateIssues={onUpdateIssues}
          view={view}
        />
      );
  }
};

const App = ({ rep }: { rep: Replicache<M> }) => {
  const [view] = useQueryState("view");
  const [priorityFilter] = useQueryState("priorityFilter");
  const [statusFilter] = useQueryState("statusFilter");
  const [orderBy] = useQueryState("orderBy");
  const [menuVisible, setMenuVisible] = useState(false);

  const [state, dispatch] = useReducer(timedReducer, {
    allIssuesMap: new Map(),
    viewIssueCount: 0,
    filteredIssues: [],
    filters: getFilters(view, priorityFilter, statusFilter),
    issueOrder: getIssueOrder(view, orderBy),
  });

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
          {view !== "detail" && (
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
          <Layout
            view={view}
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
