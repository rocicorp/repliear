import React, { CSSProperties, useEffect, useRef } from "react";
import IssueRow from "./issue-row";
import AutoSizer from "react-virtualized-auto-sizer";
import { FixedSizeList } from "react-window";
import type { Issue, IssueValue, Priority, Status } from "./issue";

interface Props {
  onUpdateIssue: (id: string, changes: Partial<IssueValue>) => void;
  issues: Issue[];
  issueFilter: "all" | "active" | "backlog";
}
const IssueList = ({ onUpdateIssue, issues, issueFilter }: Props) => {
  const fixedSizeListRef = useRef<FixedSizeList>(null);
  useEffect(() => {
    if (fixedSizeListRef.current) {
      fixedSizeListRef.current.scrollTo(0);
    }
  }, [issueFilter]);

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
