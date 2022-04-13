import React from "react";
import type { Replicache } from "replicache";
import { useSubscribe } from "replicache-react";
import LeftMenu from "./left-menu";
import type { M } from "./mutators";
import { getAllIssues, Issue } from "./issue";
import { useState } from "react";
import TopFilter from "./top-filter";
import IssueList from "./issue-list";

const App = ({ rep, spaceID }: { rep: Replicache<M>; spaceID: string }) => {
  const [menuVisible, setMenuVisible] = useState(false);
  const issues = useSubscribe(rep, getAllIssues, []);

  const handleCreateIssue = (issue: Issue) => rep.mutate.putIssue(issue);
  const handleUpdateIssue = (issue: Issue) =>
    rep.mutate.updateIssue({
      id: issue.id,
      changes: { status: issue.status, priority: issue.priority },
    });

  return (
    <div>
      <div className="flex w-full h-screen overflow-y-hidden">
        <LeftMenu
          spaceID={spaceID}
          menuVisible={menuVisible}
          onCloseMenu={() => setMenuVisible(false)}
          onCreateIssue={handleCreateIssue}
        />
        <div className="flex flex-col flex-grow">
          <TopFilter
            onToggleMenu={() => setMenuVisible(!menuVisible)}
            title="All issues"
            issues={issues}
          />
          <IssueList issues={issues} onUpdateIssue={handleUpdateIssue} />
        </div>
      </div>
    </div>
  );
};

export default App;
