import type {WriteTransaction} from 'replicache';
import type {Description} from './description';
import type {Issue, IssueUpdateWithID} from './issue';

export type Mutators = {
  putIssue(
    tx: WriteTransaction,
    {
      issue,
      description,
    }: {
      issue: Issue;
      description: Description;
    },
  ): Promise<void>;
  updateIssues(
    tx: WriteTransaction,
    issueUpdates: IssueUpdateWithID[],
  ): Promise<void>;
  putIssueComment(
    tx: WriteTransaction,
    comment: Comment,
    // TODO: this latter param is never sent to the backend.
    updateIssueModifed: boolean,
  ): Promise<void>;
  deleteIssueComment(tx: WriteTransaction, comment: Comment): Promise<void>;
};

export type Mutation = keyof Mutators;
export const mutationNames = [
  'putIssue',
  'updateIssues',
  'putIssueComment',
  'deleteIssueComment',
] as const;

// upgrade typescript and do satisfies?
