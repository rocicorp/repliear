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

  const totalClosedIssueCount = await getIssueCount(gitHubKey, "closed");
  const totalOpenIssueCount = await getIssueCount(gitHubKey, "open");

  console.log("totalClosedIssueCount: ", totalClosedIssueCount);
  console.log("totalOpenIssueCount: ", totalOpenIssueCount);

  const MAX_ISSUE_PER_PAGE = 100;
  const totalOpenIssuePage = Math.ceil(
    (totalOpenIssueCount - 1) / MAX_ISSUE_PER_PAGE + 1
  );
  const totalClosedIssuePage = Math.ceil(
    (totalClosedIssueCount - 1) / MAX_ISSUE_PER_PAGE + 1
  );
  const issuesOpen = await getIssues(gitHubKey, "open", totalOpenIssuePage);
  const issuesClosed = await getIssues(
    gitHubKey,
    "closed",
    totalClosedIssuePage
  );
  const allIssues = [...issuesOpen, ...issuesClosed];
  stdout.write(JSON.stringify(allIssues, null, 4));
  process.exit(0);
}

async function getIssueCount(
  gitHubKey: string,
  state: "open" | "closed"
): Promise<number> {
  const issueCountUrl = (state: "open" | "closed") =>
    `https://api.github.com/search/issues?q=repo:${gitHubRepo}+type:issue+state:${state}&page=0&per_page=1`;

  return await fetch(issueCountUrl(state), {
    headers: {
      "Content-Type": "application/json",
      Authorization: `token ${gitHubKey}`,
    },
  })
    // @ts-ignore
    .then((response) => response.json())
    // @ts-ignore
    .then((data) => {
      return data.total_count;
    });
}

async function getIssues(
  gitHubKey: string,
  state: "open" | "closed",
  totalPages: number
): Promise<any[]> {
  const MAX_ISSUE_PER_PAGE = 100;

  const issueUrl = (state: "open" | "closed", page: number) =>
    `https://api.github.com/repos/${gitHubRepo}/issues?state=${state}&per_page=${MAX_ISSUE_PER_PAGE}&page=${page}`;
  let issues = [];
  for (let i = 1; i <= totalPages; i++) {
    const dots = ".".repeat(i);
    const left = totalPages - i;
    const empty = " ".repeat(left);
    process.stdout.write(`\r[${dots}${empty}] ${i}/${totalPages}`);
    let pagedIssues = await fetch(issueUrl(state, i), {
      headers: {
        "Content-Type": "application/json",
        Authorization: `token ${gitHubKey}`,
      },
    })
      // @ts-ignore
      .then((response) => response.json())
      // @ts-ignore
      .then((data) => {
        return data;
      });

    pagedIssues = await fillComments(pagedIssues, gitHubKey);
    issues.push(pagedIssues);
  }
  return issues;
}

async function fillComments(pagedIssues: any[], gitHubKey: string) {
  const commentedIssues = await pagedIssues.map(async (i) => {
    let r = await fetch(i.comments_url, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `token ${gitHubKey}`,
      },
    });
    const commentJson = await r.json();
    return {
      ...i,
      comments_expanded: commentJson
    };
  });
  return await commentedIssues;
}

main(gitHubKey, gitHubRepo);
