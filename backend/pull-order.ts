import {
  commentSchema,
  COMMENT_KEY_PREFIX,
  DESCRIPTION_KEY_PREFIX,
  getDescriptionIssueId,
  getIssue,
  issueSchema,
  ISSUE_KEY_PREFIX,
  reverseTimestampSortKey,
} from "../frontend/issue";
import type { JSONValue, ReadTransaction } from "replicache";
import { assertNotUndefined } from "util/asserts";

export async function getPullOrder(
  tx: ReadTransaction,
  entry: [key: string, value: JSONValue]
): Promise<string> {
  const [key, value] = entry;
  let issue;
  if (key.startsWith(ISSUE_KEY_PREFIX)) {
    issue = issueSchema.parse(value);
  } else if (key.startsWith(COMMENT_KEY_PREFIX)) {
    const comment = commentSchema.parse(value);
    issue = await getIssue(tx, comment.issueID);
  } else if (key.startsWith(DESCRIPTION_KEY_PREFIX)) {
    issue = await getIssue(tx, getDescriptionIssueId(key));
  }
  assertNotUndefined(issue);
  return reverseTimestampSortKey(issue.modified, issue.id) + "-" + key;
}
