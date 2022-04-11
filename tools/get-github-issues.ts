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
  const issueUrl = (page: number, createdDate: string) =>
    `https://api.github.com/search/issues?q=repo:${gitHubRepo}+is:issue+created:>${createdDate}&page=${page}&per_page=${MAX_ISSUE_PER_PAGE}&sort=created&order=asc`;

  let issues: any[] = [];
  let lastDateStr = new Date(0).toISOString();
  let currentDateStr = new Date(0).toISOString();
  let issueUrlQueue: any[] = [issueUrl(1, currentDateStr)];
  let page = 1;
  let totalCount = 0;
  while (issueUrlQueue.length > 0) {
    process.stdout.write(
      `\r[${Math.round(
        (totalCount / totalPages) * 100
      )}%] ${totalCount}/${totalPages}`
    );
    let url = issueUrlQueue.pop();
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `token ${gitHubKey}`,
      },
    });

    const responseIssues = await response.json();
    if (
      responseIssues.message ===
      "Only the first 1000 search results are available"
    ) {
      currentDateStr = lastDateStr;
      page = 1;
      issueUrlQueue.push(issueUrl(page, currentDateStr));
      continue;
    }

    if (responseIssues.message) {
      console.log(responseIssues.message);
    }

    if (responseIssues.items === 0) {
      break;
    }
    lastDateStr =
      responseIssues.items &&
      responseIssues.items[responseIssues.items.length - 1]?.created_at;
    if (!lastDateStr) {
      break;
    }

    let pagedIssues = responseIssues.items;

    pagedIssues = await fillComments(pagedIssues, gitHubKey);

    issues = [...issues, ...pagedIssues];
    page++;
    totalCount++;
    issueUrlQueue.push(issueUrl(page, currentDateStr));
    await sleep(2000);
  }
  console.log("\nfound: ", issues.length);
  return issues;
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
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
