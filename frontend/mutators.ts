import type { MutatorDefs, WriteTransaction } from "replicache";
import { putIssue, getIssue, issueKey } from "./issue";
import type { IssueValue } from "./issue";

export type M = typeof mutators;
export const mutators: MutatorDefs = {
  putIssue,
  updateIssue: async (
    tx: WriteTransaction,
    {
      id,
      changes,
    }: {
      id: string;
      changes: Partial<IssueValue>;
    }
  ): Promise<void> => {
    const issue = await getIssue(tx, id);
    if (issue === undefined) {
      console.info(`Issue ${id} not found`);
      return;
    }
    const changed = { ...issue, ...changes };
    await putIssue(tx, changed);
  },

  deleteIssues: async (tx: WriteTransaction, ids: string[]): Promise<void> => {
    for (const id of ids) {
      await tx.del(issueKey(id));
    }
  },
};
