import type {
  ReadonlyJSONValue,
  ReadTransaction,
  WriteTransaction,
} from "replicache";
import { z } from "zod";

export const ISSUE_KEY_PREFIX = `issue/`;
export const issueKey = (id: string) => `${ISSUE_KEY_PREFIX}${id}`;
export const issueID = (key: string) => {
  if (!key.startsWith(ISSUE_KEY_PREFIX)) {
    throw new Error(`Invalid issue key: ${key}`);
  }
  return key.substring(ISSUE_KEY_PREFIX.length);
};

export enum Priority {
  NONE = "NONE",
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  URGENT = "URGENT",
}

export const priorityEnumSchema = z.nativeEnum(Priority);
export type PriorityEnum = z.infer<typeof priorityEnumSchema>;

export enum Status {
  BACKLOG = "BACKLOG",
  TODO = "TODO",
  IN_PROGRESS = "IN_PROGRESS",
  DONE = "DONE",
  CANCELED = "CANCELED",
}

export const statusEnumSchema = z.nativeEnum(Status);
export type StatusEnum = z.infer<typeof statusEnumSchema>;

export enum Order {
  CREATED = "CREATED",
  MODIFIED = "MODIFIED",
  KANBAN = "KANBAN",
}

export const orderEnumSchema = z.nativeEnum(Order);
export type OrderEnum = z.infer<typeof orderEnumSchema>;

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
  creator: z.string(),
  kanbanOrder: z.string(),
});

export type Issue = z.TypeOf<typeof issueSchema>;
export type IssueValue = z.TypeOf<typeof issueValueSchema>;
export const issueValueSchema = issueSchema.omit({
  id: true,
});

export type IssueUpdate = {
  id: string;
  changes: Partial<IssueValue>;
  description?: Description;
};

export async function getIssue(
  tx: ReadTransaction,
  id: string
): Promise<Issue | undefined> {
  const val = await tx.get(issueKey(id));
  if (val === undefined) {
    return undefined;
  }
  return {
    ...issueValueSchema.parse(val),
    id,
  };
}

export async function putIssue(
  tx: WriteTransaction,
  issue: Issue
): Promise<void> {
  await tx.put(issueKey(issue.id), issue);
}

export function issueFromKeyAndValue(
  key: string,
  value: ReadonlyJSONValue
): Issue {
  return {
    ...issueValueSchema.parse(value),
    id: issueID(key),
  };
}

export const DESCRIPTION_KEY_PREFIX = `description/`;
export const descriptionKey = (issueID: string) =>
  `${DESCRIPTION_KEY_PREFIX}${issueID}`;
export const descriptionSchema = z.string();

export type Description = z.TypeOf<typeof descriptionSchema>;
export async function getIssueDescription(
  tx: ReadTransaction,
  issueID: string
): Promise<Description | undefined> {
  const entry = await tx.get(descriptionKey(issueID));
  if (entry === undefined) {
    return undefined;
  }
  return descriptionSchema.parse(entry);
}

export async function putIssueDescription(
  tx: WriteTransaction,
  issueID: string,
  description: Description
): Promise<void> {
  await tx.put(descriptionKey(issueID), description);
}

export const COMMENT_KEY_PREFIX = `comment/`;
export const commentKey = (issueID: string, commentID: string) =>
  `${COMMENT_KEY_PREFIX}${issueID}/${commentID}`;
export const commentIDs = (key: string) => {
  if (!key.startsWith(COMMENT_KEY_PREFIX)) {
    throw new Error(`Invalid comment key: ${key}`);
  }
  const ids = key.substring(COMMENT_KEY_PREFIX.length).split("/");
  if (ids.length !== 2) {
    throw new Error(`Invalid comment key: ${key}`);
  }
  return {
    issueID: ids[0],
    commentID: ids[1],
  };
};

export const commentSchema = z.object({
  id: z.string(),
  issueID: z.string(),
  created: z.number(),
  body: z.string(),
  creator: z.string(),
});

export type Comment = z.TypeOf<typeof commentSchema>;
export type CommentValue = z.TypeOf<typeof commentValueSchema>;
export const commentValueSchema = commentSchema.omit({
  id: true,
  issueID: true,
});

export async function getIssueComments(
  tx: ReadTransaction,
  issueID: string
): Promise<Comment[]> {
  const entries = await tx
    .scan({ prefix: COMMENT_KEY_PREFIX + issueID })
    .entries()
    .toArray();
  return entries.map(([key, val]) => {
    const ids = commentIDs(key);
    return {
      ...commentValueSchema.parse(val),
      id: ids.commentID,
      issueID: ids.issueID,
    };
  });
}

export async function putIssueComment(
  tx: WriteTransaction,
  comment: Comment
): Promise<void> {
  await tx.put(commentKey(comment.issueID, comment.id), comment);
}
