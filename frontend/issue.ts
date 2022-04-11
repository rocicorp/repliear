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

const priorityEnumSchema = z.nativeEnum(Priority);
export type PriorityEnum = z.infer<typeof priorityEnumSchema>;

export enum Status {
  BACKLOG = 1,
  TODO = 2,
  IN_PROGRESS = 3,
  DONE = 4,
  CANCELED = 5,
}

const statusEnumSchema = z.nativeEnum(Status);
export type StatusEnum = z.infer<typeof statusEnumSchema>;

export const issueSchema = z.object({
  id: z.string(),
  title: z.string(),
  priority: priorityEnumSchema,
  status: statusEnumSchema,
  modified: z.number(),
  description: z.string(),
});

export type Issue = z.TypeOf<typeof issueSchema>;
export type IssueValue = z.TypeOf<typeof issueValueSchema>;
export const issueValueSchema = issueSchema.omit({ id: true });

export async function getIssue(
  tx: ReadTransaction,
  id: string
): Promise<Issue | undefined> {
  const val = await tx.get(issueKey(id));
  if (val === undefined) {
    return undefined;
  }
  return {
    id,
    ...issueValueSchema.parse(val),
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
};

const i2: Issue = {
  priority: Priority.MEDIUM,
  id: "2",
  title: "Issue 2",
  description: "",
  status: Status.IN_PROGRESS,
  modified: 0,
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

export async function getAllIssues(tx: ReadTransaction) {
  return getIssues(tx);
}

export async function getIssues(
  tx: ReadTransaction,
  limit?: number
): Promise<Issue[]> {
  const entries = await tx
    .scan({ prefix: issuePrefix, limit })
    .entries()
    .toArray();
  const issues = entries.map(([key, val]) => ({
    id: issueID(key),
    ...issueValueSchema.parse(val),
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
