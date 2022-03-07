import { useSubscribe } from "replicache-react";
import { M } from "./mutators";
import { Replicache } from "replicache";
import { getAllTodos, todoPrefix } from "./todo";

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

export function useFilteredTodos(rep: Replicache<M>, filter: string) {
  return useSubscribe(
    rep,
    async (tx) => {
      const todos = await getAllTodos(tx);
      switch (filter) {
        case "All":
          return todos;
        case "Completed":
          return todos.filter(([_, t]) => t.completed);
        case "Active":
          return todos.filter(([_, t]) => !t.completed);
        default:
          throw new Error("Unknown filter: " + filter);
      }
    },
    []
  );
}
