import { useSubscribe } from "replicache-react";
import { M } from "./mutators";
import { Replicache } from "replicache";
import { getAllTodos, Todo, todoID, todoKey, todoPrefix } from "./todo";

export function useTodo(rep: Replicache<M>, id: string | undefined) {
  return useSubscribe(
    rep,
    async (tx) => {
      if (id === undefined) {
        return null;
      }
      return (await tx.get(todoKey(id))) as Todo | null;
    },
    null
  );
}

export function useTodosCount(rep: Replicache<M>) {
  return useSubscribe(
    rep,
    async (tx) => {
      return (await tx.scan({ prefix: todoPrefix }).keys().toArray()).length;
    },
    0
  );
}

export function useCompletedCount(rep: Replicache<M>) {
  return useSubscribe(
    rep,
    async (tx) => {
      const todos = await getAllTodos(tx);
      return todos.filter(([, todo]) => todo.completed).length;
    },
    0
  );
}

export function useFilteredTodoIDs(rep: Replicache<M>, filter: string) {
  return useSubscribe(
    rep,
    async (tx) => {
      const todos = await getAllTodos(tx);
      const filtered = todos.filter(([_, t]) => {
        switch (filter) {
          case "all":
            return true;
          case "active":
            return !t.completed;
          case "completed":
            return t.completed;
          default:
            throw new Error("Unknown filter: " + filter);
        }
      });
      return filtered.map(([id]) => id);
    },
    []
  );
}
