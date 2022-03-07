import { ReadTransaction } from "replicache";
import { z } from "zod";

export const todoPrefix = `todo/`;

export const todoKey = (id: string) => `${todoPrefix}${id}`;

export const todoID = (key: string) => {
  if (!key.startsWith(todoPrefix)) {
    throw new Error(`Invalid key: ${key}`);
  }
  return key.substring(todoPrefix.length + 1);
};

export const todoSchema = z.object({
  text: z.string(),
  completed: z.boolean(),
});

export type Todo = z.TypeOf<typeof todoSchema>;

export async function getTodo(
  tx: ReadTransaction,
  id: string
): Promise<Todo | undefined> {
  const val = await tx.get(todoKey(id));
  if (val === undefined) {
    // Delete/write conflict -- no-op.
    return undefined;
  }
  return todoSchema.parse(val);
}

export async function getAllTodos(
  tx: ReadTransaction
): Promise<[id: string, value: Todo][]> {
  const entries = await tx.scan({ prefix: todoPrefix }).entries().toArray();
  return entries.map(([key, val]) => [todoID(key), todoSchema.parse(val)]);
}
