import React, { memo, useCallback, useEffect, useReducer } from "react";
import type {
  ExperimentalDiff as Diff,
  ReadonlyJSONValue,
  ReadTransaction,
  Replicache,
} from "replicache";
import LeftMenu from "./left-menu";
import type { M } from "./mutators";
import {
  Issue,
  issueFromKeyAndValue,
  ISSUE_KEY_PREFIX,
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
  IssueUpdateWithID,
} from "./issue";
import { useState } from "react";
import TopFilter from "./top-filter";
import IssueList from "./issue-list";
import { useQueryState } from "next-usequerystate";
import IssueBoard from "./issue-board";
import { isEqual, minBy, partial, pickBy, sortBy, sortedIndexBy } from "lodash";
import IssueDetail from "./issue-detail";
import { generateKeyBetween } from "fractional-indexing";
import { useSubscribe } from "replicache-react";
import classnames from "classnames";
import { getPartialSyncState, PartialSyncState } from "./control";
import type { UndoManager } from "@rocicorp/undo";
import { HotKeys } from "react-hotkeys";

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
  const orderIteratee = partial(getOrderValue, issueOrder);
  function filterAndSort(issues: Issue[]): Issue[] {
    return sortBy(
      issues.filter((issue) => filters.issuesFilter(issue)),
      orderIteratee
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
      return diffReducer(state, action.diff);
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
        filteredIssues: sortBy(state.filteredIssues, orderIteratee),
        issueOrder: action.issueOrder,
      };
    }
  }

  return state;
}

function diffReducer(state: State, diff: Diff): State {
  if (diff.length === 0) {
    return state;
  }
  const newAllIssuesMap = new Map(state.allIssuesMap);
  let newViewIssueCount = state.viewIssueCount;
  const newFilteredIssues = [...state.filteredIssues];
  const orderIteratee = partial(getOrderValue, state.issueOrder);

  function add(key: string, newValue: ReadonlyJSONValue) {
    const newIssue = issueFromKeyAndValue(key, newValue);
    newAllIssuesMap.set(key, newIssue);
    if (state.filters.viewFilter(newIssue)) {
      newViewIssueCount++;
    }
    if (state.filters.issuesFilter(newIssue)) {
      newFilteredIssues.splice(
        sortedIndexBy(newFilteredIssues, newIssue, orderIteratee),
        0,
        newIssue
      );
    }
  }
  function del(key: string, oldValue: ReadonlyJSONValue) {
    const oldIssue = issueFromKeyAndValue(key, oldValue);
    const index = sortedIndexBy(newFilteredIssues, oldIssue, orderIteratee);
    newAllIssuesMap.delete(key);
    if (state.filters.viewFilter(oldIssue)) {
      newViewIssueCount--;
    }
    if (newFilteredIssues[index]?.id === oldIssue.id) {
      newFilteredIssues.splice(index, 1);
    }
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
  return {
    ...state,
    allIssuesMap: newAllIssuesMap,
    viewIssueCount: newViewIssueCount,
    filteredIssues: newFilteredIssues,
  };
}

type AppProps = {
  rep: Replicache<M>;
  undoManager: UndoManager;
};

const App = ({ rep, undoManager }: AppProps) => {
  const [view] = useQueryState("view");
  const [priorityFilter] = useQueryState("priorityFilter");
  const [statusFilter] = useQueryState("statusFilter");
  const [orderBy] = useQueryState("orderBy");
  const [detailIssueID, setDetailIssueID] = useQueryState("iss");
  const [menuVisible, setMenuVisible] = useState(false);

  const [state, dispatch] = useReducer(timedReducer, {
    allIssuesMap: new Map(),
    viewIssueCount: 0,
    filteredIssues: [],
    filters: getFilters(view, priorityFilter, statusFilter),
    issueOrder: getIssueOrder(view, orderBy),
  });

  const partialSync = useSubscribe<
    PartialSyncState | "NOT_RECEIVED_FROM_SERVER"
  >(
    rep,
    async (tx: ReadTransaction) => {
      return (await getPartialSyncState(tx)) || "NOT_RECEIVED_FROM_SERVER";
    },
    "NOT_RECEIVED_FROM_SERVER"
  );

  const partialSyncComplete = partialSync === "PARTIAL_SYNC_COMPLETE";
  useEffect(() => {
    console.log("partialSync", partialSync);
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
    [rep.mutate, state.allIssuesMap]
  );
  const handleCreateComment = useCallback(
    async (comment: Comment) => {
      await undoManager.add({
        execute: () => rep.mutate.putIssueComment(comment),
        undo: () => rep.mutate.deleteIssueComment(comment),
      });
    },
    [rep.mutate, undoManager]
  );

  const handleUpdateIssues = useCallback(
    async (issueUpdates: Array<IssueUpdate>) => {
      const uChanges: Array<IssueUpdateWithID> = issueUpdates.map<IssueUpdateWithID>(
        (issueUpdate) => {
          const undoChanges = pickBy(
            issueUpdate.issue,
            (_, key) => key in issueUpdate.issueChanges
          );
          const rv: IssueUpdateWithID = {
            id: issueUpdate.issue.id,
            issueChanges: undoChanges,
          };
          const { descriptionUpdate } = issueUpdate;
          if (descriptionUpdate) {
            return {
              ...rv,
              descriptionChange: descriptionUpdate.description,
            };
          }
          return rv;
        }
      );
      await undoManager.add({
        execute: () =>
          rep.mutate.updateIssues(
            issueUpdates.map(({ issue, issueChanges, descriptionUpdate }) => {
              const rv: IssueUpdateWithID = {
                id: issue.id,
                issueChanges,
              };
              if (descriptionUpdate) {
                return {
                  ...rv,
                  descriptionChange: descriptionUpdate.description,
                };
              }
              return rv;
            })
          ),
        undo: () => rep.mutate.updateIssues(uChanges),
      });
    },
    [rep.mutate, undoManager]
  );

  const handleOpenDetail = useCallback(
    async (issue: Issue) => {
      await setDetailIssueID(issue.id, { scroll: false, shallow: true });
    },
    [setDetailIssueID]
  );
  const handleCloseMenu = useCallback(() => setMenuVisible(false), [
    setMenuVisible,
  ]);
  const handleToggleMenu = useCallback(() => setMenuVisible(!menuVisible), [
    setMenuVisible,
    menuVisible,
  ]);

  const handlers = {
    undo: () => undoManager.undo(),
    redo: () => undoManager.redo(),
  };

  return (
    <HotKeys
      {...{
        keyMap,
        handlers,
      }}
    >
      <Layout
        menuVisible={menuVisible}
        view={view}
        detailIssueID={detailIssueID}
        isLoading={!partialSyncComplete}
        state={state}
        rep={rep}
        onCloseMenu={handleCloseMenu}
        onToggleMenu={handleToggleMenu}
        onUpdateIssues={handleUpdateIssues}
        onCreateIssue={handleCreateIssue}
        onCreateComment={handleCreateComment}
        onOpenDetail={handleOpenDetail}
      ></Layout>
    </HotKeys>
  );
};

const keyMap = {
  undo: ["ctrl+z", "command+z"],
  redo: ["ctrl+y", "command+shift+z", "ctrl+shift+z"],
};

interface LayoutProps {
  menuVisible: boolean;
  view: string | null;
  detailIssueID: string | null;
  isLoading: boolean;
  state: State;
  rep: Replicache<M>;
  onCloseMenu: () => void;
  onToggleMenu: () => void;
  onUpdateIssues: (issueUpdates: IssueUpdate[]) => void;
  onCreateIssue: (
    issue: Omit<Issue, "kanbanOrder">,
    description: Description
  ) => void;
  onCreateComment: (comment: Comment) => void;
  onOpenDetail: (issue: Issue) => void;
}

const RawLayout = ({
  menuVisible,
  view,
  detailIssueID,
  isLoading,
  state,
  rep,
  onCloseMenu,
  onToggleMenu,
  onUpdateIssues,
  onCreateIssue,
  onCreateComment,
  onOpenDetail,
}: LayoutProps) => {
  return (
    <div>
      <div className="flex w-full h-screen overflow-y-hidden">
        <LeftMenu
          menuVisible={menuVisible}
          onCloseMenu={onCloseMenu}
          onCreateIssue={onCreateIssue}
        />
        <div className="flex flex-col flex-grow min-w-0">
          <div
            className={classnames("flex flex-col", {
              hidden: detailIssueID,
            })}
          >
            <TopFilter
              onToggleMenu={onToggleMenu}
              title={getTitle(view)}
              filteredIssuesCount={
                state.filters.hasNonViewFilters
                  ? state.filteredIssues.length
                  : undefined
              }
              issuesCount={state.viewIssueCount}
              showSortOrderMenu={view !== "board"}
            />
          </div>
          <div className="relative flex flex-1 min-h-0">
            {detailIssueID && (
              <IssueDetail
                issues={state.filteredIssues}
                rep={rep}
                onUpdateIssues={onUpdateIssues}
                onAddComment={onCreateComment}
                isLoading={isLoading}
              />
            )}
            <div
              className={classnames("absolute inset-0 flex flex-col", {
                invisible: detailIssueID,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                "pointer-events-none": detailIssueID,
              })}
            >
              {view === "board" ? (
                <IssueBoard
                  issues={state.filteredIssues}
                  onUpdateIssues={onUpdateIssues}
                  onOpenDetail={onOpenDetail}
                />
              ) : (
                <IssueList
                  issues={state.filteredIssues}
                  onUpdateIssues={onUpdateIssues}
                  onOpenDetail={onOpenDetail}
                  view={view}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Layout = memo(RawLayout);

export default App;
