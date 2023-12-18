import {z} from 'zod';
import {generate, Update} from '@rocicorp/rails';
import {entitySchema} from './entitySchema';

export const descriptionSchema = entitySchema.extend({
  body: z.string(),
});
export type Description = z.infer<typeof descriptionSchema>;
export type DescriptionUpdate = Update<Description>;

export const {
  set: putDescription,
  get: getDescription,
  delete: deleteDescription,
} = generate('description', descriptionSchema.parse);
