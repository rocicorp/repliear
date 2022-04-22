import { IssueWithoutIndexFields, Priority, Status } from "../frontend/issue";

export async function getReactIssues(): Promise<IssueWithoutIndexFields[]> {
  const issues = (await import("./issues-react.js.gz")).default.map(
    (reactIssue) => ({
      id: reactIssue.id.toString(),
      // TODO: Remove this title and body truncation when we add incremental
      // client view sync.  Without this the initial pull response
      // exceeds the nextjs max response size.
      title: reactIssue.title.substring(0, 100),
      description: "", // (reactIssue.body || "").substring(0, 100),
      priority: getPriority(reactIssue.id),
      status: getStatus(reactIssue.id, reactIssue.state === "open"),
      modified: Date.parse(reactIssue.updated_at),
      created: Date.parse(reactIssue.created_at),
    })
  );
  return issues;
}

function getStatus(id: number, open: boolean): Status {
  if (!open) {
    switch (id % 2) {
      case 0:
        return Status.DONE;
      case 1:
        return Status.CANCELED;
    }
  }
  switch (id % 3) {
    case 0:
      return Status.BACKLOG;
    case 1:
      return Status.TODO;
    case 2:
      return Status.IN_PROGRESS;
  }
  return Status.TODO;
}

function getPriority(id: number): Priority {
  switch (id % 5) {
    case 0:
      return Priority.NONE;
    case 1:
      return Priority.LOW;
    case 2:
      return Priority.MEDIUM;
    case 3:
      return Priority.HIGH;
    case 4:
      return Priority.URGENT;
  }
  return Priority.NONE;
}
