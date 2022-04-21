import React, { useEffect, useReducer } from "react";
import type { Diff, Replicache } from "replicache";
import LeftMenu from "./left-menu";
import type { M } from "./mutators";
import {
  getAllIssuesMap,
  Issue,
  issueFromKeyAndValue,
  issuePrefix,
  IssueValue,
  Priority,
  priorityEnumSchema,
  Status,
  statusEnumSchema,
} from "./issue";
import { useState } from "react";
import TopFilter from "./top-filter";
import IssueList from "./issue-list";
import { useQueryState } from "next-usequerystate";
import IssueBoard from "./issue-board";
import { sortBy, sortedIndexBy } from "lodash";

type IssueFilter = {
  status?: Set<Status>;
  priority?: Set<Priority>;
};

function getIssueFilter(
  view: string | null,
  priorityFilter: string | null,
  statusFilter: string | null
): IssueFilter {
  switch (view?.toLowerCase()) {
    case "active":
      return {
        status: new Set([Status.IN_PROGRESS, Status.TODO]),
      };
    case "backlog":
      return {
        status: new Set([Status.IN_PROGRESS, Status.TODO]),
      };
    default: {
      let status = undefined;
      let priority = undefined;
      if (statusFilter) {
        status = new Set<Status>();
        for (const s of statusFilter.split(",")) {
          const parseResult = statusEnumSchema.safeParse(s);
          if (parseResult.success) {
            status.add(parseResult.data);
          }
        }
        if (status.size === 0) {
          status = undefined;
        }
      }
      if (priorityFilter) {
        priority = new Set<Priority>();
        for (const p of priorityFilter.split(",")) {
          const parseResult = priorityEnumSchema.safeParse(p);
          if (parseResult.success) {
            priority.add(parseResult.data);
          }
        }
        if (priority.size === 0) {
          priority = undefined;
        }
      }
      return {
        status,
        priority,
      };
    }
  }
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

const App = ({ rep }: { rep: Replicache<M> }) => {
  const [view] = useQueryState("view");
  const [priorityFilter] = useQueryState("priorityFilter");
  const [statusFilter] = useQueryState("statusFilter");
  // const [orderBy] = useQueryState("orderBy", {
  //   defaultValue: "modified",
  // });
  const [menuVisible, setMenuVisible] = useState(false);

  type State = {
    allIssuesMap: Map<string, Issue>;
    issuesView: Issue[];
    issueFilter: IssueFilter;
  };
  function reducer(
    state: State,
    action:
      | {
          type: "init";
          allIssuesMap: Map<string, Issue>;
        }
      | {
          type: "diff";
          diff: Diff;
        }
      | {
          type: "setIssueFilter";
          issueFilter: IssueFilter;
        }
  ): State {
    const issueFilter =
      action.type === "setIssueFilter" ? action.issueFilter : state.issueFilter;
    function filter(issue: Issue): boolean {
      if (issueFilter.status) {
        if (!issueFilter.status.has(issue.status)) {
          return false;
        }
      }
      if (issueFilter.priority) {
        if (!issueFilter.priority.has(issue.priority)) {
          return false;
        }
      }
      return true;
    }
    function order(issue: Issue): string {
      return Number.MAX_SAFE_INTEGER - issue.modified + "-" + issue.id;
    }
    function filterAndSort(issues: Issue[]): Issue[] {
      return sortBy(issues.filter(filter), order);
    }

    switch (action.type) {
      case "init":
        return {
          ...state,
          allIssuesMap: action.allIssuesMap,
          issuesView: filterAndSort([...action.allIssuesMap.values()]),
        };
      case "diff": {
        const newAllIssuesMap = new Map(state.allIssuesMap);
        const newIssuesView = [...state.issuesView];
        for (const diffOp of action.diff) {
          switch (diffOp.op) {
            case "add": {
              const newIssue = issueFromKeyAndValue(
                diffOp.key,
                diffOp.newValue
              );
              newAllIssuesMap.set(diffOp.key, newIssue);
              if (filter(newIssue)) {
                newIssuesView.splice(
                  sortedIndexBy(newIssuesView, newIssue, order),
                  0,
                  newIssue
                );
              }
              break;
            }
            case "del": {
              const oldIssue = issueFromKeyAndValue(
                diffOp.key,
                diffOp.oldValue
              );
              const index = sortedIndexBy(newIssuesView, oldIssue, order);
              if (newIssuesView[index]?.id === oldIssue.id) {
                newIssuesView.splice(index, 1);
              }
              newAllIssuesMap.delete(diffOp.key);
              break;
            }
            case "change": {
              const oldIssue = issueFromKeyAndValue(
                diffOp.key,
                diffOp.oldValue
              );
              const index = sortedIndexBy(newIssuesView, oldIssue, order);
              if (newIssuesView[index]?.id === oldIssue.id) {
                newIssuesView.splice(index, 1);
              }
              const newIssue = issueFromKeyAndValue(
                diffOp.key,
                diffOp.newValue
              );
              newAllIssuesMap.set(diffOp.key, newIssue);
              if (filter(newIssue)) {
                newIssuesView.splice(
                  sortedIndexBy(newIssuesView, newIssue, order),
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
          issuesView: newIssuesView,
        };
      }
      case "setIssueFilter": {
        return {
          ...state,
          issuesView: filterAndSort([...state.allIssuesMap.values()]),
          issueFilter: action.issueFilter,
        };
      }
    }
    return state;
  }
  const [state, dispatch] = useReducer(reducer, {
    allIssuesMap: new Map(),
    issuesView: [],
    issueFilter: getIssueFilter(view, priorityFilter, statusFilter),
  });
  useEffect(() => {
    async function fetchIssues() {
      const allIssues = await rep.query((tx) => getAllIssuesMap(tx));
      dispatch({
        type: "init",
        allIssuesMap: allIssues,
      });
      rep.watch(
        (diff) => {
          dispatch({
            type: "diff",
            diff,
          });
        },
        { prefix: issuePrefix }
      );
    }
    void fetchIssues();
  }, [rep]);

  useEffect(() => {
    dispatch({
      type: "setIssueFilter",
      issueFilter: getIssueFilter(view, priorityFilter, statusFilter),
    });
  }, [view, priorityFilter, statusFilter]);

  const handleCreateIssue = (issue: IssueValue) => rep.mutate.putIssue(issue);
  const handleUpdateIssue = (id: string, changes: Partial<IssueValue>) =>
    rep.mutate.updateIssue({
      id,
      changes,
    });

  return (
    <div>
      <div className="flex w-full h-screen overflow-y-hidden">
        <LeftMenu
          menuVisible={menuVisible}
          onCloseMenu={() => setMenuVisible(false)}
          onCreateIssue={handleCreateIssue}
        />
        <div className="flex flex-col flex-grow">
          <TopFilter
            onToggleMenu={() => setMenuVisible(!menuVisible)}
            title={getTitle(view)}
            issuesCount={state.issuesView.length}
          />
          {view === "board" ? (
            <IssueBoard rep={rep} />
          ) : (
            <IssueList
              issues={state.issuesView}
              onUpdateIssue={handleUpdateIssue}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
