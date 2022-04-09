// @ts-ignore
const gitHubKey = process.env.GITHUB_KEY;
const gitHubRepo = process.env.GITHUB_REPO;
// @ts-ignore
const fetch = require("node-fetch");
const fs = require("fs");

async function main(
  gitHubKey: string | undefined,
  gitHubRepo: string | undefined,
  outputFile: string = "./issues.json"
): Promise<void> {
  const fileStream = fs.createWriteStream(outputFile);
  await mainImpl(gitHubKey, gitHubRepo, fileStream);
}

async function mainImpl(
  gitHubKey: string | undefined,
  gitHubRepo: string | undefined,
  stdout: NodeJS.WritableStream = process.stdout
): Promise<void> {
  if (!gitHubKey || !gitHubRepo) {
    console.log("ERROR: must have a GITHUB_KEY and/or GITHUB_REPO defined");
    process.exit(1);
  }
  console.log("gitHubKey:\t", gitHubKey);
  console.log("gitHubRepo:\t", gitHubRepo);

  const totalIssueCount = await getIssueCount(gitHubKey);

  console.log("totalIssueCount: ", totalIssueCount);

  const MAX_ISSUE_PER_PAGE = 100;
  const totalAllIssuePage = Math.floor(
    (totalIssueCount - 1) / MAX_ISSUE_PER_PAGE + 1
  );

  const allIssues = await getIssues(gitHubKey, totalAllIssuePage);
  stdout.write(JSON.stringify(allIssues, null, 4));
  process.exit(0);
}

async function getIssueCount(gitHubKey: string): Promise<number> {
  const issueCountUrl = `https://api.github.com/search/issues?q=repo:${gitHubRepo}+is:issue&page=0&per_page=1`;

  const response = await fetch(issueCountUrl, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `token ${gitHubKey}`,
    },
  });

  const issues = await response.json();
  return issues.total_count;
}

async function getIssues(
  gitHubKey: string,
  totalPages: number
): Promise<any[]> {
  const MAX_ISSUE_PER_PAGE = 100;
  const issueUrl = (page: number) =>
    `https://api.github.com/search/issues?q=repo:${gitHubRepo}+is:issue&page=${page}&per_page=${MAX_ISSUE_PER_PAGE}`;

  let issues = [];
  for (let i = 1; i <= totalPages; i++) {
    process.stdout.write(
      `\r[${Math.round((i / totalPages) * 100)}%] ${i}/${totalPages}`
    );

    const url = issueUrl(i);
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `token ${gitHubKey}`,
      },
    });

    const responseIssues = await response.json();
    let pagedIssues = responseIssues.items;
    pagedIssues = await fillComments(pagedIssues, gitHubKey);
    issues.push(pagedIssues);
  }

  return issues;
}

async function fillComments(pagedIssues: any[], gitHubKey: string) {
  if (!pagedIssues) {
    return pagedIssues;
  }
  const commentedIssues = Promise.all(
    pagedIssues.map(async (i) => {
      let r = await fetch(i.comments_url, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `token ${gitHubKey}`,
        },
      });
      const commentJson = await r.json();
      return {
        ...i,
        comments_expanded: commentJson,
      };
    })
  );
  return commentedIssues;
}

main(gitHubKey, gitHubRepo);
