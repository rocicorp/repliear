import type { ReadTransaction, WriteTransaction } from "replicache";
import { z } from "zod";

export const issuePrefix = `issue/`;

export const issueKey = (id: string) => `${issuePrefix}${id}`;

export const issueID = (key: string) => {
  if (!key.startsWith(issuePrefix)) {
    throw new Error(`Invalid key: ${key}`);
  }
  return key.substring(issuePrefix.length);
};

enum Priority {
  NONE,
  LOW,
  MEDIUM,
  HIGH,
  URGENT,
}

export const PriorityEnum = z.nativeEnum(Priority);
export type PriorityEnum = z.infer<typeof PriorityEnum>;

enum Status {
  BACKLOG = 1,
  TODO = 2,
  IN_PROGRESS = 3,
  DONE = 4,
  CANCELED = 5,
}

export const StatusEnum = z.nativeEnum(Status);
export type StatusEnum = z.infer<typeof StatusEnum>;

const userSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  avatar: z.string().optional(),
});

export type User = z.TypeOf<typeof userSchema>;
export const User = userSchema;
export const issueSchema = z.object({
  id: z.string(),
  title: z.string(),
  priority: PriorityEnum,
  status: StatusEnum,
  modified: z.number(),
  owner: User,
  description: z.string(),
});

export type Issue = z.TypeOf<typeof issueSchema>;

const IssueValueSchema = issueSchema.omit({ id: true });

export async function getIssue(
  tx: ReadTransaction,
  id: string
): Promise<Issue | undefined> {
  const val = await tx.get(issueKey(id));
  if (val === undefined) {
    // Delete/write conflict -- no-op.
    return undefined;
  }
  return {
    id,
    ...IssueValueSchema.parse(val),
  };
}

export async function putIssue(
  tx: WriteTransaction,
  issue: Issue
): Promise<void> {
  await tx.put(issueKey(issue.id), issue);
}

const i1: Issue = {
  priority: Priority.HIGH,
  id: "1",
  title: "Issue 1",
  description: "",
  status: Status.IN_PROGRESS,
  modified: 0,
  owner: {},
};

const i2: Issue = {
  priority: Priority.MEDIUM,
  id: "2",
  title: "Issue 2",
  description: "",
  status: Status.IN_PROGRESS,
  modified: 0,
  owner: {},
};

const i3: Issue = {
  priority: Priority.LOW,
  id: "3",
  title: "Issue 3",
  description: "",
  status: Status.TODO,
  modified: 0,
  owner: {},
};

export const SampleIssues: Issue[] = [i1, i2, i3];

export async function getAllIssues(tx: ReadTransaction): Promise<Issue[]> {
  const entries = await tx.scan({ prefix: issuePrefix }).entries().toArray();
  const issues = entries.map(([key, val]) => ({
    id: issueID(key),
    ...IssueValueSchema.parse(val),
  }));
  return issues;
}

export type IssuesByStatusType = {
  backlog: Issue[];
  todo: Issue[];
  inProgress: Issue[];
  done: Issue[];
  canceled: Issue[];
};

export type Label = {
  id: string;
  name: string;
  color: string;
};

export const DEFAULT_LABELS: Label[] = [
  { id: "1", name: "Bug", color: "#eb5757" },
  { id: "2", name: "Feature", color: "#bb87fc" },
  { id: "3", name: "Improvement", color: "#4ea7fc" },
];

// todo: can do this with a fancy groupBy
export const getIssuebyType = (allIssues: Issue[]): IssuesByStatusType => {
  return {
    backlog: allIssues.filter((r) => r.status == Status.BACKLOG),
    todo: allIssues.filter((r) => r.status == Status.TODO),
    inProgress: allIssues.filter((r) => r.status == Status.IN_PROGRESS),
    done: allIssues.filter((r) => r.status == Status.DONE),
    canceled: allIssues.filter((r) => r.status == Status.CANCELED),
  };
};
