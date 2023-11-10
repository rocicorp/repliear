/* eslint-disable @typescript-eslint/naming-convention */
import type {ReadonlyJSONValue, ReadTransaction} from 'replicache';
import {
  Comment,
  commentSchema,
  Issue,
  issueSchema,
  Priority,
  Status,
} from 'shared';
import {z} from 'zod';

export const priorityOrderValues: Record<Priority, string> = {
  URGENT: '1',
  HIGH: '2',
  MEDIUM: '3',
  LOW: '4',
  NONE: '5',
};

export const statusOrderValues: Record<Status, string> = {
  BACKLOG: '1',
  TODO: '2',
  IN_PROGRESS: '3',
  DONE: '4',
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
  return issueSchema.parse(value);
}

export const COMMENT_KEY_PREFIX = `comment/`;
export async function getIssueComments(
  tx: ReadTransaction,
  issueID: string,
): Promise<Comment[]> {
  const values = await tx
    .scan({prefix: COMMENT_KEY_PREFIX + issueID})
    .values()
    .toArray();
  return values.map(val => {
    return commentSchema.parse(val);
  });
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
