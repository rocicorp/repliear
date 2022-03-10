import { ReadTransaction, WriteTransaction } from "replicache";
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
  id: z.string(),
  text: z.string(),
  completed: z.boolean(),
  sort: z.number(),
});

export type Todo = z.TypeOf<typeof todoSchema>;

const todoValueSchema = todoSchema.omit({ id: true });

export async function getTodo(
  tx: ReadTransaction,
  id: string
): Promise<Todo | undefined> {
  const val = await tx.get(todoKey(id));
  if (val === undefined) {
    // Delete/write conflict -- no-op.
    return undefined;
  }
  return {
    id,
    ...todoValueSchema.parse(val),
  };
}

export async function putTodo(tx: WriteTransaction, todo: Todo): Promise<void> {
  await tx.put(todoKey(todo.id), todo);
}

export async function getAllTodos(tx: ReadTransaction): Promise<Todo[]> {
  const entries = await tx.scan({ prefix: todoPrefix }).entries().toArray();
  const todos = entries.map(([key, val]) => ({
    id: todoID(key),
    ...todoValueSchema.parse(val),
  }));
  todos.sort((a, b) => a.sort - b.sort);
  return todos;
}
