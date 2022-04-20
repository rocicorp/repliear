import { IssueWithoutIndexFields, Priority, Status } from "../frontend/issue";

export async function getReactIssues(): Promise<IssueWithoutIndexFields[]> {
  const issues = (await import("./issues-react.js.gz")).default.map(
    (reactIssue) => ({
      priority: Priority.NONE,
      id: reactIssue.id.toString(),
      // TODO: Remove this title and body truncation when we add incremental
      // client view sync.  Without this the initial pull response
      // exceeds the nextjs max response size.
      title: reactIssue.title.substring(0, 100),
      description: "", // (reactIssue.body || "").substring(0, 100),
      status: reactIssue.state === "open" ? Status.TODO : Status.DONE,
      modified: Date.parse(reactIssue.updated_at),
      created: Date.parse(reactIssue.created_at)
    })
  );
  return issues;
}
