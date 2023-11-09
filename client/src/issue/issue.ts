import type {
  ReadonlyJSONValue,
  ReadTransaction,
  WriteTransaction,
} from 'replicache';
import {
  Comment,
  commentSchema,
  Issue,
  issueSchema,
  Priority,
  Status,
} from 'shared';
import {z} from 'zod';
import type {Immutable} from '../util/immutable';

export const priorityOrderValues: Record<Priority, string> = {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  URGENT: '1',
  // eslint-disable-next-line @typescript-eslint/naming-convention
  HIGH: '2',
  // eslint-disable-next-line @typescript-eslint/naming-convention
  MEDIUM: '3',
  // eslint-disable-next-line @typescript-eslint/naming-convention
  LOW: '4',
  // eslint-disable-next-line @typescript-eslint/naming-convention
  NONE: '5',
};

export const statusOrderValues: Record<Status, string> = {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  BACKLOG: '1',
  // eslint-disable-next-line @typescript-eslint/naming-convention
  TODO: '2',
  // eslint-disable-next-line @typescript-eslint/naming-convention
  IN_PROGRESS: '3',
  // eslint-disable-next-line @typescript-eslint/naming-convention
  DONE: '4',
  // eslint-disable-next-line @typescript-eslint/naming-convention
  CANCELED: '5',
};

export enum Filter {
  PRIORITY,
  STATUS,
}

const filterEnumSchema = z.nativeEnum(Filter);
export type FilterEnum = z.infer<typeof filterEnumSchema>;

export function issueFromKeyAndValue(
  _key: string,
  value: ReadonlyJSONValue,
): Issue {
  return {
    ...issueSchema.parse(value),
  };
}

export const COMMENT_KEY_PREFIX = `comment/`;
export const commentKey = (issueID: string, commentID: string) =>
  `${COMMENT_KEY_PREFIX}${issueID}/${commentID}`;
export const commentIDs = (key: string) => {
  if (!key.startsWith(COMMENT_KEY_PREFIX)) {
    throw new Error(`Invalid comment key: ${key}`);
  }
  const ids = key.substring(COMMENT_KEY_PREFIX.length).split('/');
  if (ids.length !== 2) {
    throw new Error(`Invalid comment key: ${key}`);
  }
  return {
    issueID: ids[0],
    commentID: ids[1],
  };
};

export type CommentValue = Immutable<z.TypeOf<typeof commentValueSchema>>;
export const commentValueSchema = commentSchema.omit({
  id: true,
  issueID: true,
});

export async function getIssueComments(
  tx: ReadTransaction,
  issueID: string,
): Promise<Comment[]> {
  const entries = await tx
    .scan({prefix: COMMENT_KEY_PREFIX + issueID})
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
  comment: Comment,
): Promise<void> {
  await tx.put(commentKey(comment.issueID, comment.id), comment);
}

const REVERSE_TIMESTAMP_LENGTH = Number.MAX_SAFE_INTEGER.toString().length;

export function reverseTimestampSortKey(timestamp: number, id: string): string {
  return (
    Math.floor(Number.MAX_SAFE_INTEGER - timestamp)
      .toString()
      .padStart(REVERSE_TIMESTAMP_LENGTH, '0') +
    '-' +
    id
  );
}
