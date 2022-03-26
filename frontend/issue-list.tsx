import React from "react";
import { IssuesByStatus as allIssues } from "../util/issues";
// import IssueContextMenu from './IssueContextMenu';
import IssueRow from "./issue-row";

// const ConnectedMenu = connectMenu('ISSUE_CONTEXT_MENU')(IssueContextMenu);
function IssueList() {
  let issues = [
    ...allIssues.backlog,
    ...allIssues.todo,
    ...allIssues.inProgress,
    ...allIssues.done,
    ...allIssues.canceled,
  ];
  // sort issues by id
  issues = issues.sort((a, b) => {
    let aId = parseInt(a.id.split("-")[1]);
    let bId = parseInt(b.id.split("-")[1]);
    return aId - bId;
  });

  var issueRows = issues.map((issue, idx) => (
    <IssueRow issue={issue} key={idx} />
  ));
  return <div className="flex flex-col overflow-auto">{issueRows}</div>;
}

export default IssueList;
