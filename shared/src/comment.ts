import {z} from 'zod';
import {generate, Update} from '@rocicorp/rails';
import {entitySchema} from './entitySchema';

export const commentSchema = entitySchema.extend({
  issueID: z.string(),
  created: z.number(),
  body: z.string(),
  creator: z.string(),
});
export type Comment = z.infer<typeof commentSchema>;
export type CommentUpdate = Update<Comment>;

export const {
  init: createComment,
  get: getComment,
  delete: deleteComment,
} = generate('comment', commentSchema.parse);
