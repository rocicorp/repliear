import React, { CSSProperties, useEffect, useRef, useState } from "react";
import IssueRow from "./issue-row";
import { getAllIssues, Issue, IssueValue, Priority, Status } from "./issue";
import AutoSizer from "react-virtualized-auto-sizer";
import { FixedSizeList } from "react-window";
import type { Replicache } from "replicache";
import type { M } from "./mutators";
import { sortBy } from "lodash";
//import { sortedIndexBy } from "lodash";

interface Props {
  onUpdateIssue: (id: string, changes: Partial<IssueValue>) => void;
  rep: Replicache<M>;
  issueFilter: "all" | "active" | "backlog";
}
const IssueList = ({ onUpdateIssue, rep, issueFilter }: Props) => {
  const fixedSizeListRef = useRef<FixedSizeList>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  useEffect(() => {
    if (fixedSizeListRef.current) {
      fixedSizeListRef.current.scrollTo(0);
    }
    setIssues([]);
    async function fetchIssues() {
      const start = Date.now();
      let issues = await rep.query((tx) => getAllIssues(tx));
      console.log("loaded", Date.now() - start);
      issues = issues.filter((issue) => {
        switch (issueFilter) {
          case "active":
            return (
              issue.status === Status.IN_PROGRESS ||
              issue.status === Status.TODO
            );
          case "backlog":
            return issue.status === Status.BACKLOG;
          default:
            return true;
        }
      });
      console.log("filtered", Date.now() - start);
      issues = sortBy(issues, (issue) =>
        (Number.MAX_SAFE_INTEGER - issue.modified).toString().padStart(16, "0")
      );
      console.log("sorted", Date.now() - start);
      setIssues(issues);
    }
    void fetchIssues();
  }, [rep, issueFilter]);

  const handleChangePriority = (issue: Issue, priority: Priority) => {
    onUpdateIssue(issue.id, { priority });
  };

  const handleChangeStatus = (issue: Issue, status: Status) => {
    onUpdateIssue(issue.id, { status });
  };

  const Row = ({ index, style }: { index: number; style: CSSProperties }) => (
    <div style={style}>
      <IssueRow
        issue={issues[index]}
        key={issues[index].id}
        onChangePriority={handleChangePriority}
        onChangeStatus={handleChangeStatus}
      />
    </div>
  );
  return (
    <div className="flex flex-col flex-grow overflow-auto">
      <AutoSizer>
        {({ height, width }) => (
          <FixedSizeList
            ref={fixedSizeListRef}
            height={height}
            itemCount={issues.length}
            itemSize={43}
            overscanCount={10}
            width={width}
          >
            {Row}
          </FixedSizeList>
        )}
      </AutoSizer>
    </div>
  );
};

export default IssueList;
