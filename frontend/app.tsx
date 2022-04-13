import React from "react";
import type { Replicache } from "replicache";
//import { useSubscribe } from "replicache-react";
import LeftMenu from "./left-menu";
import type { M } from "./mutators";
import type { Issue, IssueValue } from "./issue";
import { useState } from "react";
import TopFilter from "./top-filter";
import IssueList from "./issue-list";

const App = ({ rep }: { rep: Replicache<M> }) => {
  const [menuVisible, setMenuVisible] = useState(false);
  //const issues = useSubscribe(rep, getAllIssues, []);

  const handleCreateIssue = (issue: Issue) => rep.mutate.putIssue(issue);
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
            title="All issues"
            issuesCount={10000}
          />
          <IssueList rep={rep} onUpdateIssue={handleUpdateIssue} />
        </div>
      </div>
    </div>
  );
};

export default App;
