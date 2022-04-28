import type { WriteTransaction } from "replicache";
import {
  putIssue,
  getIssue,
  issueKey,
  Description,
  putIssueDescription,
  putIssueComment,
  Issue,
} from "./issue";
import type { IssueValue } from "./issue";

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
  updateIssue: async (
    tx: WriteTransaction,
    {
      id,
      changes,
      description,
    }: {
      id: string;
      changes: Partial<IssueValue>;
      description?: Description;
    }
  ): Promise<void> => {
    const issue = await getIssue(tx, id);
    if (issue === undefined) {
      console.info(`Issue ${id} not found`);
      return;
    }
    const changed = { ...issue, ...changes };
    await putIssue(tx, changed);
    if (description) {
      await putIssueDescription(tx, id, description);
    }
  },
  deleteIssues: async (tx: WriteTransaction, ids: string[]): Promise<void> => {
    for (const id of ids) {
      await tx.del(issueKey(id));
    }
  },
  putIssueComment,
};
