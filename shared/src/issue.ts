import {z} from 'zod';
import {generate} from '@rocicorp/rails';
import {entitySchema} from './entitySchema';
import {Description, descriptionSchema} from './description';

export const priorities = ['NONE', 'LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
export type Priority = (typeof priorities)[number];
export const statuses = [
  'BACKLOG',
  'TODO',
  'IN_PROGRESS',
  'DONE',
  'CANCELED',
] as const;
export type Status = (typeof statuses)[number];

export const orders = [
  'CREATED',
  'MODIFIED',
  'STATUS',
  'PRIORITY',
  'KANBAN',
] as const;
export type Order = (typeof orders)[number];

export const ISSUE_KEY_PREFIX = `issue/`;

export const issueSchema = entitySchema.extend({
  title: z.string(),
  priority: z.enum(priorities),
  status: z.enum(statuses),
  modified: z.number(),
  created: z.number(),
  creator: z.string(),
  kanbanOrder: z.string(),
});

export const issueKeysToColumns = {
  title: 'title',
  priority: 'priority',
  status: 'status',
  modified: 'modified',
  created: 'created',
  creator: 'creator',
  kanbanOrder: 'kanbanorder',
} as const;

export const issueWithDescriptionSchema = z.object({
  issue: issueSchema,
  description: descriptionSchema,
});
export type IssueWithDescription = z.infer<typeof issueWithDescriptionSchema>;

export type IssueUpdate = {
  issue: Issue;
  issueChanges: Partial<Issue>;
  descriptionUpdate?:
    | {
        description: Description['body'];
        descriptionChange: Description['body'];
      }
    | undefined;
};

export const issueUpdateWithIDSchema = z.object({
  id: z.string(),
  issueChanges: issueSchema.partial(),
  descriptionChange: z.string().optional(),
});

export type IssueUpdateWithID = z.infer<typeof issueUpdateWithIDSchema>;

export type Issue = z.infer<typeof issueSchema>;

export const {
  put: putIssue,
  list: listIssues,
  get: getIssue,
  delete: deleteIssue,
} = generate('issue', issueSchema.parse);
