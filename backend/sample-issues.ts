import { Issue, Priority, Status } from "../frontend/issue";

export async function getReactIssues(): Promise<Issue[]> {
  return (await import("./issues-react.js.gz")).default.map((reactIssue) => ({
    priority: Priority.NONE,
    id: reactIssue.id.toString(),
    // TODO: Remove this title and body truncation when we add incremental
    // client view sync.  Without this the initial pull response
    // exceeds the nextjs max response size.
    title: reactIssue.title.substring(0, 150),
    description: (reactIssue.body || "").substring(0, 150),
    status: reactIssue.state === "open" ? Status.TODO : Status.DONE,
    modified: Date.parse(reactIssue.updated_at),
  }));
}
