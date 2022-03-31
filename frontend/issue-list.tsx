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
    const aId = parseInt(a.id.split("-")[1]);
    const bId = parseInt(b.id.split("-")[1]);
    return aId - bId;
  });

  const issueRows = issues.map((issue, idx) => (
    <IssueRow issue={issue} key={idx} />
  ));
  return <div className="flex flex-col overflow-auto">{issueRows}</div>;
};

export default IssueList;
