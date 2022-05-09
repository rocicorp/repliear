import type { WriteTransaction } from "replicache";
import {
  putIssue,
  getIssue,
  issueKey,
  Description,
  putIssueDescription,
  putIssueComment,
  Comment,
  Issue,
  IssueUpdate,
} from "./issue";

export type M = typeof mutators;
export const mutators = {
  putIssue: async (
    tx: WriteTransaction,
    {
      issue,
      description,
    }: {
      issue: Issue;
      description: Description;
    }
  ): Promise<void> => {
    await putIssue(tx, issue);
    await putIssueDescription(tx, issue.id, description);
  },
  updateIssues: async (
    tx: WriteTransaction,
    issueUpdates: IssueUpdate[]
  ): Promise<void> => {
    const modified = Date.now();
    for (const { id, changes, description } of issueUpdates) {
      const issue = await getIssue(tx, id);
      if (issue === undefined) {
        console.info(`Issue ${id} not found`);
        return;
      }
      const changed = { ...issue, ...changes };
      changed.modified = modified;
      await putIssue(tx, changed);
      if (description) {
        await putIssueDescription(tx, id, description);
      }
    }
  },
  deleteIssues: async (tx: WriteTransaction, ids: string[]): Promise<void> => {
    for (const id of ids) {
      await tx.del(issueKey(id));
    }
  },
  putIssueComment: async (
    tx: WriteTransaction,
    comment: Comment
  ): Promise<void> => {
    const issue = await getIssue(tx, comment.issueID);
    if (issue === undefined) {
      console.info(`Issue ${comment.issueID} not found`);
      return;
    }
    const changed = { ...issue, modified: Date.now() };
    await putIssue(tx, changed);
    await putIssueComment(tx, comment);
  },
};
