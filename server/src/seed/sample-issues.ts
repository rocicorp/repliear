import {generateNKeysBetween} from 'fractional-indexing';
import type {Description, Issue, Comment, Status, Priority} from 'shared';
import {readFile} from 'fs/promises';
import zlib from 'zlib';

export type SampleData = {
  issue: Issue;
  description: Description;
  comments: Comment[];
};

export type GithubIssue = {
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  // eslint-disable-next-line @typescript-eslint/naming-convention
  updated_at: string;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  created_at: string;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  creator_user_login: string;
};

export type GithubComment = {
  number: number;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  comment_id: string;
  body: string | null;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  updated_at: string;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  created_at: string;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  creator_user_login: string;
};

export async function getReactSampleData(): Promise<SampleData[]> {
  const issuesDefault = await loadGzippedJson<GithubIssue[]>(
    './issues-react.json.gz',
  );

  const issuesCount = issuesDefault.length;
  const kanbanOrderKeys = generateNKeysBetween(null, null, issuesCount);
  const issues: SampleData[] = issuesDefault.map((reactIssue, idx) => ({
    issue: {
      id: reactIssue.number.toString(),
      title: reactIssue.title,
      priority: getPriority(reactIssue),
      status: getStatus(reactIssue),
      modified: Date.parse(reactIssue.updated_at),
      created: Date.parse(reactIssue.created_at),
      creator: reactIssue.creator_user_login,
      kanbanOrder: kanbanOrderKeys[idx],
    },
    description: {
      id: reactIssue.number.toString(),
      body: reactIssue.body || '',
    },
    comments: [],
  }));

  const comments = (
    await loadGzippedJson<GithubComment[]>('./comments-react.json.gz')
  ).map(reactComment => ({
    id: reactComment.comment_id,
    issueID: reactComment.number.toString(),
    created: Date.parse(reactComment.created_at),
    body: reactComment.body || '',
    creator: reactComment.creator_user_login,
  }));
  for (const comment of comments) {
    const issue = issues.find(issue => issue.issue.id === comment.issueID);
    if (issue) {
      issue.comments.push(comment);
    }
  }
  issues;

  // Can use this to generate artifically larger datasets for stress testing or
  // smaller for debugging.
  const factor = 10;
  let commentId = 1;
  if (factor >= 1) {
    const multiplied: SampleData[] = [];
    for (let i = 0; i < factor; i++) {
      multiplied.push(
        ...issues.map(issue => ({
          ...issue,
          issue: {
            ...issue.issue,
            id: issue.issue.id + '-' + i,
          },
          description: {
            ...issue.description,
            id: issue.issue.id + '-' + i,
          },
          comments: issue.comments.map(comment => ({
            ...comment,
            issueID: comment.issueID + '-' + i,
            id: `${comment.issueID}-${i}/${commentId++}`,
          })),
        })),
      );
    }
    return multiplied;
  }

  const decimated: SampleData[] = [];
  for (let i = 0; i < issues.length * factor; ++i) {
    decimated.push(issues[i]);
    decimated[i].comments = decimated[i].comments.map(comment => ({
      ...comment,
      id: `${comment.issueID}/${commentId++}`,
    }));
  }

  return decimated;
}

function getStatus({
  number,
  created_at,
}: {
  number: number;
  state: 'open' | 'closed';
  // eslint-disable-next-line @typescript-eslint/naming-convention
  created_at: string;
}): Status {
  const stableRandom = number + Date.parse(created_at);
  // 90% closed, 10% open
  if (stableRandom % 10 < 8) {
    // 2/3's done, 1/3 cancelled
    switch (stableRandom % 3) {
      case 0:
      case 1:
        return 'DONE';
      case 2:
        return 'CANCELED';
    }
  }
  switch (stableRandom % 6) {
    // 2/6 backlog, 3/6 todo, 1/6 in progress
    case 0:
    case 1:
      return 'BACKLOG';
    case 2:
    case 3:
    case 4:
      return 'TODO';
    case 5:
      return 'IN_PROGRESS';
  }
  return 'TODO';
}

function getPriority({
  number,
  created_at,
}: {
  number: number;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  created_at: string;
}): Priority {
  const stableRandom = number + Date.parse(created_at);
  // bell curve priorities
  switch (stableRandom % 10) {
    case 0:
      return 'NONE';
    case 1:
    case 2:
      return 'LOW';
    case 3:
    case 4:
    case 5:
    case 6:
      return 'MEDIUM';
    case 7:
    case 8:
      return 'HIGH';
    case 9:
      return 'URGENT';
  }
  return 'NONE';
}

async function loadGzippedJson<T>(relPath: string): Promise<T> {
  const content = await readFile(new URL(relPath, import.meta.url));
  return await new Promise<T>((resolve, reject) => {
    zlib.gunzip(content, (err, buffer) => {
      if (err) {
        reject(err);
      } else {
        resolve(JSON.parse(buffer.toString()));
      }
    });
  });
}
