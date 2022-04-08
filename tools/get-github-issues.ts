// @ts-ignore
async function main(
  gitHubKey: string | undefined,
  gitHubRepo: string | undefined
): Promise<void> {
  await mainImpl(gitHubKey, gitHubRepo);
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

  const issuesOpen = await getIssues(gitHubKey, "open", 1);

  const issuesClosed = await getIssues(gitHubKey, "closed", 1);

  stdout.write(JSON.stringify(issuesOpen));
  stdout.write(JSON.stringify(issuesClosed));

  process.exit(0);
}

async function getIssueCount(
  gitHubKey: string,
  state: "open" | "closed"
): Promise<number> {
  const fetch = require("node-fetch");

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
  const fetch = require("node-fetch");

  const MAX_ISSUE_PER_PAGE = 1000;

  const issueUrl = (state: "open" | "closed", page: number) =>
    `https://api.github.com/repos/facebook/react/issues?state=${state}&per_page=${MAX_ISSUE_PER_PAGE}&page=${page}`;
  let issues = [];
  for (let i = 1; i == totalPages; i++) {
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

    issues.push(pagedIssues);
  }
  return issues;
}

const gitHubKey = process.env.GITHUB_KEY;
const gitHubRepo = process.env.GITHUB_REPO;

main(gitHubKey, gitHubRepo);
