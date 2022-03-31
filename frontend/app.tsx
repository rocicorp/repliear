import React from "react";
import type { Replicache } from "replicache";
import { useSubscribe } from "replicache-react";
import LeftMenu from "./left-menu";
import type { M } from "./mutators";
import { getAllIssues } from "./issue";
import { useState } from "react";
import TopFilter from "./top-filter";
import IssueList from "./issue-list";

const App = ({ rep }: { rep: Replicache<M> }) => {
  const [menuVisible, setMenuVisible] = useState(false);
  const issues = useSubscribe(rep, getAllIssues, []);

  return (
    <div>
      <div className="flex w-full h-screen overflow-y-hidden">
        <LeftMenu
          menuVisible={menuVisible}
          onCloseMenu={() => setMenuVisible(false)}
        />
        <div className="flex flex-col flex-grow">
          <TopFilter
            onToggleMenu={() => setMenuVisible(!menuVisible)}
            title="All issues"
            issues={issues}
          />
          <IssueList issues={issues} />
        </div>
      </div>
    </div>
  );
};

export default App;
