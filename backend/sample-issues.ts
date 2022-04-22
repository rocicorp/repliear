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
      priority: getPriority(reactIssue),
      status: getStatus(reactIssue),
      modified: Date.parse(reactIssue.updated_at),
      created: Date.parse(reactIssue.created_at),
    })
  );
  return issues;
}

function getStatus({
  id,
  state,
  created_at,
}: {
  id: number;
  state: "open" | "closed";
  // eslint-disable-next-line @typescript-eslint/naming-convention
  created_at: string;
}): Status {
  const stableRandom = id + Date.parse(created_at);
  if (state === "closed") {
    // 2/3's done, 1/3 cancelled
    switch (stableRandom % 3) {
      case 0:
      case 1:
        return Status.DONE;
      case 2:
        return Status.CANCELED;
    }
  }
  switch (stableRandom % 6) {
    // 2/6 backlog, 3/6 todo, 1/6 in progress
    case 0:
    case 1:
      return Status.BACKLOG;
    case 2:
    case 3:
    case 4:
      return Status.TODO;
    case 5:
      return Status.IN_PROGRESS;
  }
  return Status.TODO;
}

function getPriority({
  id,
  created_at,
}: {
  id: number;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  created_at: string;
}): Priority {
  const stableRandom = id + Date.parse(created_at);
  // bell curve priorities
  switch (stableRandom % 10) {
    case 0:
      return Priority.NONE;
    case 1:
    case 2:
      return Priority.LOW;
    case 3:
    case 4:
    case 5:
    case 6:
      return Priority.MEDIUM;
    case 7:
    case 8:
      return Priority.HIGH;
    case 9:
      return Priority.URGENT;
  }
  return Priority.NONE;
}
