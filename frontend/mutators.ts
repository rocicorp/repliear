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
  commentKey,
  deleteIssueComments,
  deleteIssueDescription,
  IssueUpdateWithID,
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
    issueUpdates: IssueUpdateWithID[]
  ): Promise<void> => {
    const modified = Date.now();
    for (const { id, changes } of issueUpdates) {
      const issue = await getIssue(tx, id);
      if (issue === undefined) {
        console.info(`Issue ${id} not found`);
        return;
      }
      const changed = { ...issue, ...changes };
      changed.modified = modified;
      await putIssue(tx, changed);
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
  updateIssueDescription: async (
    tx: WriteTransaction,
    {
      issueID,
      description,
    }: {
      issueID: string;
      description: Description;
    }
  ): Promise<void> => {
    const issue = await getIssue(tx, issueID);
    if (issue === undefined) {
      console.info(`Issue ${issueID} not found`);
      return;
    }
    const updateModifiedTime = { ...issue, modified: Date.now() };
    await putIssue(tx, updateModifiedTime);
    await putIssueDescription(tx, issueID, description);
  },
};
