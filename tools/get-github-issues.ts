// @ts-ignore
async function main(
  gitHubKey: string | undefined,
  gitHubRepo: string | undefined
): Promise<void> {
  await mainImpl(gitHubKey, gitHubRepo);
}

async function mainImpl(
  gitHubKey: string | undefined,
  gitHubRepo: string | undefined
  //stdout: NodeJS.WritableStream = process.stdout
): Promise<void> {
  const fetch = require("node-fetch");
  if (!gitHubKey || !gitHubRepo) {
    console.log("ERROR: must have a GITHUB_KEY and/or GITHUB_REPO defined");
    process.exit(1);
  }
  console.log("gitHubKey:\t", gitHubKey);
  console.log("gitHubRepo:\t", gitHubRepo);

  //const MAX_ISSUE_PER_PAGE = 1000;

  const issueCountUrl =
    "https://api.github.com/search/issues?q=repo:nodejs/node+type:issue+state:closed+state:open&page=0&per_page=1";

  //const issueUrl = `https://api.github.com/repos/facebook/react/issues?state=closed&per_page=1000&page={}`;
  let totalClosedIssueCount = 0;

  //let totalOpenIssueCount = 0;

  await fetch(issueCountUrl, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `token ${gitHubKey}`,
    },
  })
    // @ts-ignore
    .then((response) => response.json())
    // @ts-ignore
    .then((data) => {
      totalClosedIssueCount = data.total_count;
    });

  console.log("totalClosedIssueCount: ", totalClosedIssueCount);
  process.exit(0);
}

const gitHubKey = process.env.GITHUB_KEY;
const gitHubRepo = process.env.GITHUB_REPO;

main(gitHubKey, gitHubRepo);
