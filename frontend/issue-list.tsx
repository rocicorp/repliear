import React from "react";
import IssueRow from "./issue-row";
import type { Issue, Priority, Status } from "./issue";

interface Props {
  issues: Issue[];
  onUpdateIssue: (i: Issue) => void;
}
const IssueList = ({ issues, onUpdateIssue }: Props) => {
  // sort issues by id
  issues = issues.sort((a, b) => {
    const aModified = a.modified;
    const bModified = b.modified;
    return aModified - bModified;
  });

  const handleChangePriority = (issue: Issue, priority: Priority) => {
    issue.priority = priority;
    onUpdateIssue(issue);
  };

  const handleChangeStatus = (issue: Issue, status: Status) => {
    issue.status = status;
    onUpdateIssue(issue);
  };

  const issueRows = issues.map((issue, idx) => (
    <IssueRow
      issue={issue}
      key={idx}
      onChangePriority={handleChangePriority}
      onChangeStatus={handleChangeStatus}
    />
  ));
  return <div className="flex flex-col overflow-auto">{issueRows}</div>;
};

export default IssueList;
