import { Priority, Status } from "../frontend/issue";
import { initSpace } from "./data";
import reactGitHubIssues from "./issues-react.js.gz";
import type { Executor } from "./pg";

export const reactIssues = reactGitHubIssues.map((reactIssue) => ({
  priority: Priority.NONE,
  id: reactIssue.id.toString(),
  // TODO: Remove this title and body truncation when we add incremental
  // client view sync.  Without this the initial pull response
  // exceeds the nextjs max response size.
  title: reactIssue.title.substring(0, 150),
  description: reactIssue.body || "".substring(0, 150),
  status: reactIssue.state === "open" ? Status.TODO : Status.DONE,
  modified: Date.parse(reactIssue.updated_at),
}));

export function initSpaceWithReactIssues(executor: Executor, spaceID: string) {
  return initSpace(executor, spaceID, reactIssues);
}
