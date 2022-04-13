import React, { CSSProperties } from "react";
import IssueRow from "./issue-row";
import type { Issue, Priority, Status } from "./issue";
import AutoSizer from "react-virtualized-auto-sizer";
import { FixedSizeList } from "react-window";

interface Props {
  issues: Issue[];
  onUpdateIssue: (id: string, changes: Partial<Issue>) => void;
}
const IssueList = ({ issues, onUpdateIssue }: Props) => {
  // sort issues by id
  issues = issues.sort((a, b) => {
    const aModified = a.modified;
    const bModified = b.modified;
    return aModified - bModified;
  });

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
