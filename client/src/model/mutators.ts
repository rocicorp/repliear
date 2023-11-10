import type {WriteTransaction} from 'replicache';
import {
  Comment,
  createComment,
  deleteComment,
  getIssue,
  IssueUpdateWithID,
  IssueWithDescription,
  putDescription,
  putIssue,
} from 'shared';

export type M = typeof mutators;
export const mutators = {
  putIssue: async (
    tx: WriteTransaction,
    {issue, description}: IssueWithDescription,
  ): Promise<void> => {
    await putIssue(tx, issue);
    await putDescription(tx, description);
  },
  updateIssues: async (
    tx: WriteTransaction,
    issueUpdates: IssueUpdateWithID[],
  ): Promise<void> => {
    const modified = Date.now();
    for (const {id, issueChanges: changes, descriptionChange} of issueUpdates) {
      const issue = await getIssue(tx, id);
      if (issue === undefined) {
        console.info(`Issue ${id} not found`);
        return;
      }
      const changed = {...issue, ...changes};
      changed.modified = modified;
      await putIssue(tx, changed);
      if (descriptionChange) {
        await putDescription(tx, {
          id,
          body: descriptionChange,
        });
      }
    }
  },
  putIssueComment: async (
    tx: WriteTransaction,
    comment: Comment,
    updateIssueModifed = true,
  ): Promise<void> => {
    if (updateIssueModifed) {
      const issue = await getIssue(tx, comment.issueID);
      if (issue === undefined) {
        console.info(`Issue ${comment.issueID} not found`);
        return;
      }
      const changed = {...issue, modified: Date.now()};
      await putIssue(tx, changed);
    }
    await createComment(tx, comment);
  },
  deleteIssueComment: async (
    tx: WriteTransaction,
    comment: Comment,
  ): Promise<void> => {
    await deleteComment(tx, comment.id);
  },
};
