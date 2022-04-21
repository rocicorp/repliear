import type {
  CreateIndexDefinition,
  ReadTransaction,
  WriteTransaction,
} from "replicache";
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
  NONE = "NONE",
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  URGENT = "URGENT",
}

const priorityEnumSchema = z.nativeEnum(Priority);
export type PriorityEnum = z.infer<typeof priorityEnumSchema>;

export enum Status {
  BACKLOG = "BACKLOG",
  TODO = "TODO",
  IN_PROGRESS = "IN_PROGRESS",
  DONE = "DONE",
  CANCELED = "CANCELED",
}

const statusEnumSchema = z.nativeEnum(Status);
export type StatusEnum = z.infer<typeof statusEnumSchema>;

export enum Order {
  CREATED = "CREATED",
  MODIFIED = "MODIFIED",
}

const ordenEnumSchema = z.nativeEnum(Order);
export type OrderEnum = z.infer<typeof ordenEnumSchema>;

export enum Filter {
  PRIORITY,
  STATUS,
}

const filterEnumSchema = z.nativeEnum(Filter);
export type FilterEnum = z.infer<typeof filterEnumSchema>;

export const issueSchema = z.object({
  id: z.string(),
  title: z.string(),
  priority: priorityEnumSchema,
  status: statusEnumSchema,
  modified: z.number(),
  created: z.number(),
  description: z.string(),
});

export type Issue = z.TypeOf<typeof issueSchema>;
export type IssueValue = z.TypeOf<typeof issueValueSchema>;
export const issueValueSchema = issueSchema.omit({
  id: true,
});

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

export function isActiveStatus(status: Status): boolean {
  return status === Status.TODO || status === Status.IN_PROGRESS;
}

export function isBacklogStatus(status: Status): boolean {
  return status === Status.BACKLOG;
}

export async function getAllIssues(tx: ReadTransaction) {
  const entries = await tx
    .scan({
      prefix: issuePrefix,
    })
    .entries()
    .toArray();
  const issues = entries.map(([[_, issueKey], val]) => ({
    id: issueID(issueKey),
    ...issueValueSchema.parse(val),
  }));
  return issues;
}

const ISSUES_BY_ACTIVE_REVERSE_MODIFIED_INDEX_NAME =
  "issuesByActiveReverseModified";
export function getIssuesByActiveReverseModifiedIndexDefinition(): CreateIndexDefinition {
  return {
    name: ISSUES_BY_ACTIVE_REVERSE_MODIFIED_INDEX_NAME,
    prefix: issuePrefix,
    jsonPointer: "/indexActiveReverseModified",
  };
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
  const result = { ...defaultIssueByType, ...issuesBySType };
  console.log("result", result);

  return result;
};
