import type {
  CreateIndexDefinition,
  ReadTransaction,
  ScanOptionIndexedStartKey,
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
  // milliseconds elapsed since January 1, 1970 00:00:00 UTC as base 10 string
  modified: z.number(),
  created: z.number(),
  description: z.string(),
  indexReverseModified: z.string(),
  indexActiveReverseModified: z.string(),
  indexBacklogReverseModified: z.string(),
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

const ALL_ISSUES_COUNT_KEY = "count/all";
const ACTIVE_ISSUES_COUNT_KEY = "count/active";
const BACKLOG_ISSUES_COUNT_KEY = "count/backlog";

export type IssueWithoutIndexFields = Omit<
  Issue,
  | "indexReverseModified"
  | "indexActiveReverseModified"
  | "indexBacklogReverseModified"
>;

export function addIndexFields(
  issueWithoutIndexFields: IssueWithoutIndexFields
): Issue {
  const { modified, status } = issueWithoutIndexFields;
  const reverseModified = (Number.MAX_SAFE_INTEGER - modified)
    .toString()
    .padStart(16, "0");
  return {
    ...issueWithoutIndexFields,
    indexReverseModified: reverseModified,
    indexActiveReverseModified: `${
      isActiveStatus(status) ? 1 : 0
    }-${reverseModified}`,
    indexBacklogReverseModified: `${
      isBacklogStatus(status) ? 1 : 0
    }-${reverseModified}`,
  };
}

export async function putIssue(
  tx: WriteTransaction,
  issue: IssueWithoutIndexFields,
  checkForExisting = true
): Promise<void> {
  const existingIssue = checkForExisting
    ? await getIssue(tx, issue.id)
    : undefined;
  if (existingIssue === undefined) {
    await tx.put(ALL_ISSUES_COUNT_KEY, (await getAllIssuesCount(tx)) + 1);
    if (isActiveStatus(issue.status)) {
      await tx.put(
        ACTIVE_ISSUES_COUNT_KEY,
        (await getActiveIssuesCount(tx)) + 1
      );
    }
    if (isBacklogStatus(issue.status)) {
      await tx.put(
        BACKLOG_ISSUES_COUNT_KEY,
        (await getBacklogIssuesCount(tx)) + 1
      );
    }
  } else {
    if (isActiveStatus(issue.status) && !isActiveStatus(existingIssue.status)) {
      await tx.put(
        ACTIVE_ISSUES_COUNT_KEY,
        (await getActiveIssuesCount(tx)) + 1
      );
    } else if (
      !isActiveStatus(issue.status) &&
      isActiveStatus(existingIssue.status)
    ) {
      await tx.put(
        ACTIVE_ISSUES_COUNT_KEY,
        (await getActiveIssuesCount(tx)) - 1
      );
    }
    if (
      isBacklogStatus(issue.status) &&
      !isBacklogStatus(existingIssue.status)
    ) {
      await tx.put(
        BACKLOG_ISSUES_COUNT_KEY,
        (await getBacklogIssuesCount(tx)) + 1
      );
    } else if (
      !isBacklogStatus(issue.status) &&
      isBacklogStatus(existingIssue.status)
    ) {
      await tx.put(
        BACKLOG_ISSUES_COUNT_KEY,
        (await getBacklogIssuesCount(tx)) - 1
      );
    }
  }
  await tx.put(issueKey(issue.id), addIndexFields(issue));
}

export function isActiveStatus(status: Status): boolean {
  return status === Status.TODO || status === Status.IN_PROGRESS;
}

export function isBacklogStatus(status: Status): boolean {
  return status === Status.BACKLOG;
}

export async function getAllIssuesCount(tx: ReadTransaction): Promise<number> {
  return ((await tx.get(ALL_ISSUES_COUNT_KEY)) as number | undefined) ?? 0;
}

export async function getActiveIssuesCount(
  tx: ReadTransaction
): Promise<number> {
  return ((await tx.get(ACTIVE_ISSUES_COUNT_KEY)) as number | undefined) ?? 0;
}

export async function getBacklogIssuesCount(
  tx: ReadTransaction
): Promise<number> {
  return ((await tx.get(BACKLOG_ISSUES_COUNT_KEY)) as number | undefined) ?? 0;
}

export async function getAllIssues(tx: ReadTransaction) {
  return getIssues(tx);
}

const ISSUES_BY_REVERSE_MODIFIED_INDEX_NAME = "issuesByReverseModified";
export function getIssuesByReverseModifiedIndexDefinition(): CreateIndexDefinition {
  return {
    name: ISSUES_BY_REVERSE_MODIFIED_INDEX_NAME,
    prefix: issuePrefix,
    jsonPointer: "/indexReverseModified",
  };
}

async function getIssuesByIndex(
  tx: ReadTransaction,
  indexName: string,
  prefix?: string,
  startKey?: ScanOptionIndexedStartKey,
  limit?: number
): Promise<Issue[]> {
  const entries = await tx
    .scan({
      indexName,
      prefix,
      start: startKey ? { key: startKey } : undefined,
      limit,
    })
    .entries()
    .toArray();
  const issues = entries.map(([[_, issueKey], val]) => ({
    id: issueID(issueKey),
    ...issueValueSchema.parse(val),
  }));
  return issues;
}

export async function getIssues(
  tx: ReadTransaction,
  startKey?: ScanOptionIndexedStartKey,
  limit?: number
): Promise<Issue[]> {
  return getIssuesByIndex(
    tx,
    ISSUES_BY_REVERSE_MODIFIED_INDEX_NAME,
    undefined,
    startKey,
    limit
  );
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

export async function getActiveIssues(
  tx: ReadTransaction,
  startKey?: ScanOptionIndexedStartKey,
  limit?: number
): Promise<Issue[]> {
  return getIssuesByIndex(
    tx,
    ISSUES_BY_ACTIVE_REVERSE_MODIFIED_INDEX_NAME,
    "1-",
    startKey,
    limit
  );
}

const ISSUES_BY_BACKLOG_REVERSE_MODIFIED_INDEX_NAME =
  "issuesByBacklogReverseModified";
export function getIssuesByBacklogReverseModifiedIndexDefinition(): CreateIndexDefinition {
  return {
    name: ISSUES_BY_BACKLOG_REVERSE_MODIFIED_INDEX_NAME,
    prefix: issuePrefix,
    jsonPointer: "/indexBacklogReverseModified",
  };
}

export async function getBacklogIssues(
  tx: ReadTransaction,
  startKey?: ScanOptionIndexedStartKey,
  limit?: number
): Promise<Issue[]> {
  return getIssuesByIndex(
    tx,
    ISSUES_BY_BACKLOG_REVERSE_MODIFIED_INDEX_NAME,
    "1-",
    startKey,
    limit
  );
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
