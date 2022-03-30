import type { ReadTransaction, WriteTransaction } from "replicache";
import { z } from "zod";
import groupBy from "lodash/groupBy";
export const issuePrefix = `issue/`;

export const issueKey = (id: string) => `${issuePrefix}${id}`;

export const issueID = (key: string) => {
  if (!key.startsWith(issuePrefix)) {
    throw new Error(`Invalid key: ${key}`);
  }
  return key.substring(issuePrefix.length);
};

export enum Priority {
  NONE,
  LOW,
  MEDIUM,
  HIGH,
  URGENT,
}

const PriorityEnum = z.nativeEnum(Priority);
export type PriorityEnum = z.infer<typeof PriorityEnum>;

export enum Status {
  BACKLOG = 1,
  TODO = 2,
  IN_PROGRESS = 3,
  DONE = 4,
  CANCELED = 5,
}

const StatusEnum = z.nativeEnum(Status);
export type StatusEnum = z.infer<typeof StatusEnum>;

const userSchema = z.object({
  id: z.string(),
  name: z.string(),
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
  owner: User.optional(),
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
  owner: { id: "1", name: "Aaron B" },
};

const i2: Issue = {
  priority: Priority.MEDIUM,
  id: "2",
  title: "Issue 2",
  description: "",
  status: Status.IN_PROGRESS,
  modified: 0,
  owner: { id: "2", name: "Cesar A" },
};

const i3: Issue = {
  priority: Priority.LOW,
  id: "3",
  title: "Issue 3",
  description: "",
  status: Status.TODO,
  modified: 0,
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
  [Status.BACKLOG]: Issue[];
  [Status.TODO]: Issue[];
  [Status.IN_PROGRESS]: Issue[];
  [Status.DONE]: Issue[];
  [Status.CANCELED]: Issue[];
};

export const getIssueByType = (allIssues: Issue[]): IssuesByStatusType => {
  const issuesBySType = groupBy(allIssues, "status");
  const defaultIssueByType = {
    [Status.BACKLOG]: [],
    [Status.TODO]: [],
    [Status.IN_PROGRESS]: [],
    [Status.DONE]: [],
    [Status.CANCELED]: [],
  };
  const result = { ...issuesBySType, ...defaultIssueByType };
  return result;
};
