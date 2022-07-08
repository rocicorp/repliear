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
  commentKey,
  deleteIssueComments,
  deleteIssueDescription,
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
      await deleteIssueComments(tx, id);
      await deleteIssueDescription(tx, id);
      await tx.del(issueKey(id));
    }
  },
  putIssueComment: async (
    tx: WriteTransaction,
    comment: Comment,
    updateIssueModifed = true
  ): Promise<void> => {
    if (updateIssueModifed) {
      const issue = await getIssue(tx, comment.issueID);
      if (issue === undefined) {
        console.info(`Issue ${comment.issueID} not found`);
        return;
      }
      const changed = { ...issue, modified: Date.now() };
      await putIssue(tx, changed);
    }
    await putIssueComment(tx, comment);
  },
  deleteIssueComment: async (
    tx: WriteTransaction,
    comment: Comment
  ): Promise<void> => {
    await tx.del(commentKey(comment.issueID, comment.id));
  },
};
