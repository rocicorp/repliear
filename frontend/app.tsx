import React from "react";
import type { Replicache } from "replicache";
import LeftMenu from "./left-menu";
import type { M } from "./mutators";
import type { IssueValue } from "./issue";
import { useState } from "react";
import TopFilter from "./top-filter";
import IssueList from "./issue-list";
import { useQueryState } from "next-usequerystate";
import IssueBoard from "./issue-board";

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
            issuesCount={1000}
          />
          {layoutViewParam === "board" ? (
            <IssueBoard rep={rep} issueFilter={issueFilter} />
          ) : (
            <IssueList
              rep={rep}
              onUpdateIssue={handleUpdateIssue}
              issueFilter={issueFilter}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
