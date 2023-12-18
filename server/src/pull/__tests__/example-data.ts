import type {Comment, Description, Issue} from 'shared';

let issueId = 0;
let commentId = 0;

export function reset() {
  issueId = 0;
  commentId = 0;
}

export function makeIssue(): Issue {
  return {
    id: `iss-${issueId++}`,
    title: `title-${issueId}`,
    priority: 'HIGH',
    status: 'BACKLOG',
    creator: `user-${issueId}`,
    kanbanOrder: 'aa',
    created: Date.now(),
    modified: Date.now(),
  };
}

export function makeDescription(): Description {
  return {
    id: `${getExistingIssueId()}`,
    body: `body`,
  };
}

export function makeComment(): Comment {
  return {
    id: `com-${commentId++}`,
    issueID: `${getExistingIssueId()}`,
    body: `body-${commentId}`,
    created: Date.now(),
    creator: `userx`,
  };
}

function getExistingIssueId() {
  return 'iss-' + Math.floor(Math.random() * issueId);
}
