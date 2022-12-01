import {
  commentSchema,
  COMMENT_KEY_PREFIX,
  DESCRIPTION_KEY_PREFIX,
  getDescriptionIssueId,
  issueKey,
  issueSchema,
  ISSUE_KEY_PREFIX,
  reverseTimestampSortKey,
} from "../frontend/issue";
import { getEntry } from "./data";
import type { ReadonlyJSONValue } from "replicache";
import { assertNotUndefined } from "../util/asserts";
import type { Executor } from "./pg";

export async function getSyncOrder(
  executor: Executor,
  spaceId: string,
  entry: [key: string, value: ReadonlyJSONValue]
): Promise<string> {
  // The default view is a list of issues in reverse modified order, so it is
  // preferable to sync entries in reverse modified order of their
  // corresponding issue, so that if a user clicks on an issue near the top
  // of the default initial list view the entries needed for displaying the
  // detail view is available as soon as possible.
  const [key, value] = entry;
  let issue;
  if (key.startsWith(ISSUE_KEY_PREFIX)) {
    // Note as an optimization we return all of the issue entries in the
    // first pull response regardless of sync order, but we still need
    // to assign them a sync order despite it being unused.
    issue = issueSchema.parse(value);
  } else if (key.startsWith(COMMENT_KEY_PREFIX)) {
    const comment = commentSchema.parse(value);
    issue = await getEntry(executor, spaceId, issueKey(comment.issueID));
    issue = issueSchema.parse(issue);
  } else if (key.startsWith(DESCRIPTION_KEY_PREFIX)) {
    issue = await getEntry(
      executor,
      spaceId,
      issueKey(getDescriptionIssueId(key))
    );
    issue = issueSchema.parse(issue);
  }
  assertNotUndefined(issue);
  return reverseTimestampSortKey(issue.modified, issue.id) + "-" + key;
}
