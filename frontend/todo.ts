import { ReadTransaction } from "replicache";
import { z } from "zod";

export const todoPrefix = `todo/`;

export const todoKey = (id: string) => `${todoPrefix}${id}`;

export const todoID = (key: string) => {
  if (!key.startsWith(todoPrefix)) {
    throw new Error(`Invalid key: ${key}`);
  }
  return key.substring(todoPrefix.length);
};

export const todoSchema = z.object({
  text: z.string(),
  completed: z.boolean(),
  sort: z.number(),
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

export async function getNumTodos(tx: ReadTransaction): Promise<number> {
  const keys = await tx.scan({ prefix: todoPrefix }).keys().toArray();
  return keys.length;
}

export async function getAllTodos(
  tx: ReadTransaction
): Promise<(readonly [id: string, value: Todo])[]> {
  const entries = await tx.scan({ prefix: todoPrefix }).entries().toArray();
  const todos = entries.map(
    ([key, val]) => [todoID(key), todoSchema.parse(val)] as const
  );
  todos.sort(([, a], [, b]) => a.sort - b.sort);
  return todos;
}
