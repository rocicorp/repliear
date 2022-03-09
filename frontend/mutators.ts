import { nanoid } from "nanoid";
import { WriteTransaction } from "replicache";
import { getAllTodos, getTodo, Todo, todoKey, todoSchema } from "./todo";

export type M = typeof mutators;

export const mutators = {
  addTodo: async (
    tx: WriteTransaction,
    { id, text, sort }: { id: string; text: string; sort: number }
  ): Promise<void> => {
    // TODO: It would be nice to be able to use scan() here to get the highest
    // todo, but we can't because scan() not supported in mutators due to:
    // https://github.com/rocicorp/replicache/issues/607.
    const todo: Todo = {
      text,
      completed: false,
      sort,
    };
    await tx.put(todoKey(id), todo);
  },

  editTodo: async (
    tx: WriteTransaction,
    { id, text }: { id: string; text: string }
  ): Promise<void> => {
    const todo = await getTodo(tx, id);
    if (todo !== undefined) {
      todo.text = text;
      await tx.put(todoKey(id), todo);
    }
  },

  completeTodo: async (
    tx: WriteTransaction,
    { id, completed }: { id: string; completed: boolean }
  ): Promise<void> => {
    const todo = await getTodo(tx, id);
    if (todo !== undefined) {
      todo.completed = completed;
      await tx.put(todoKey(id), todo);
    }
  },

  deleteTodo: async (tx: WriteTransaction, id: string): Promise<void> => {
    await tx.del(todoKey(id));
  },

  completeAllTodos: async (
    tx: WriteTransaction,
    completed: boolean
  ): Promise<void> => {
    const todos = await getAllTodos(tx);
    for (const [id, todo] of todos) {
      todo.completed = completed;
      await tx.put(todoKey(id), todo);
    }
  },

  clearCompletedTodos: async (tx: WriteTransaction): Promise<void> => {
    const todos = await getAllTodos(tx);
    for (const [id, todo] of todos) {
      if (todo.completed) {
        await tx.del(todoKey(id));
      }
    }
  },
};
