import {
  commentSchema,
  COMMENT_KEY_PREFIX,
  DESCRIPTION_KEY_PREFIX,
  getDescriptionIssueId,
  Issue,
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
  entry: [key: string, value: ReadonlyJSONValue],
  cachedIssue?: Issue | undefined
): Promise<string> {
  // The default view is a list of issues in reverse modified order, so it is
  // preferable to sync entries in reverse modified order of their
  // corresponding issue, so that if a user clicks on an issue near the top
  // of the default initial list view the entries needed for displaying the
  // detail view is available as soon as possible.
  const issue: Issue =
    cachedIssue ?? (await getIssue(executor, spaceId, entry));
  const [key] = entry;
  return reverseTimestampSortKey(issue.modified, issue.id) + "-" + key;
}

async function getIssue(
  executor: Executor,
  spaceId: string,
  entry: [key: string, value: ReadonlyJSONValue]
): Promise<Issue> {
  const [key, value] = entry;
  let issue: Issue | undefined;
  if (key.startsWith(ISSUE_KEY_PREFIX)) {
    // Note as an optimization we return all of the issue entries in the
    // first pull response regardless of sync order, but we still need
    // to assign them a sync order despite it being unused.
    issue = issueSchema.parse(value);
  } else if (key.startsWith(COMMENT_KEY_PREFIX)) {
    const comment = commentSchema.parse(value);
    issue = issueSchema.parse(
      await getEntry(executor, spaceId, issueKey(comment.issueID))
    );
  } else if (key.startsWith(DESCRIPTION_KEY_PREFIX)) {
    issue = issueSchema.parse(
      await getEntry(executor, spaceId, issueKey(getDescriptionIssueId(key)))
    );
  }
  assertNotUndefined(issue);
  return issue;
}
