import React from "react";
// import IssueContextMenu from './IssueContextMenu';
import IssueRow from "./issue-row";
import type { Issue } from "./issue";
// const ConnectedMenu = connectMenu('ISSUE_CONTEXT_MENU')(IssueContextMenu);

interface Props {
  issues: Issue[];
}
const IssueList = ({ issues }: Props) => {
  // sort issues by id
  issues = issues.sort((a, b) => {
    const aModified = a.modified;
    const bModified = b.modified;
    return aModified - bModified;
  });

  const issueRows = issues.map((issue, idx) => (
    <IssueRow issue={issue} key={idx} />
  ));
  return <div className="flex flex-col overflow-auto">{issueRows}</div>;
};

export default IssueList;
