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
  Status,
} from "./issue";
import { useState } from "react";
import TopFilter from "./top-filter";
import IssueList from "./issue-list";
import { useQueryState } from "next-usequerystate";
import IssueBoard from "./issue-board";
import { sortBy, sortedIndexBy } from "lodash";

type IssueFilter = "all" | "active" | "backlog";

function getIssueFilter(issueFilterQueryParam: string | null): IssueFilter {
  switch ((issueFilterQueryParam || "all").toLowerCase()) {
    case "active":
      return "active";
    case "backlog":
      return "backlog";
    default:
      return "all";
  }
}

function getTitleForIssueFilter(issueFilter: IssueFilter) {
  switch (issueFilter) {
    case "active":
      return "Active issues";
    case "backlog":
      return "Backlog issues";
    default:
      return "All issues";
  }
}

const App = ({ rep }: { rep: Replicache<M> }) => {
  const [issueFilterQueryParam] = useQueryState("issueFilter");
  const [layoutViewParam] = useQueryState("view");
  const issueFilter = getIssueFilter(issueFilterQueryParam);
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
    console.log("reducer", action);
    const issueFilter =
      action.type === "setIssueFilter" ? action.issueFilter : state.issueFilter;
    function filter(issue: Issue): boolean {
      switch (issueFilter) {
        case "active":
          return (
            issue.status === Status.IN_PROGRESS || issue.status === Status.TODO
          );
        case "backlog":
          return issue.status === Status.BACKLOG;
        default:
          return true;
      }
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
    issueFilter: getIssueFilter(issueFilterQueryParam),
  });
  useEffect(() => {
    async function fetchIssues() {
      const allIssues = await rep.query((tx) => getAllIssuesMap(tx));
      console.log(allIssues);
      dispatch({
        type: "init",
        allIssuesMap: allIssues,
      });
      rep.watch(
        (diff) => {
          console.log("diff");
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
      issueFilter: getIssueFilter(issueFilterQueryParam),
    });
  }, [issueFilterQueryParam]);

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
            title={getTitleForIssueFilter(issueFilter)}
            issuesCount={state.issuesView.length}
          />
          {layoutViewParam === "board" ? (
            <IssueBoard rep={rep} issueFilter={issueFilter} />
          ) : (
            <IssueList
              issues={state.issuesView}
              issueFilter={issueFilter}
              onUpdateIssue={handleUpdateIssue}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
