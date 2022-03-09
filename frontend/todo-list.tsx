import React from "react";
import { Replicache } from "replicache";
import { M } from "./mutators";
import { useFilteredTodoIDs } from "./subscriptions";
import { TodoItem } from "./todo-item";
//import TodoItem from "./TodoItem";

const TodoList = ({
  rep,
  visibilityFilter,
}: {
  rep: Replicache<M>;
  visibilityFilter: string;
}) => {
  return (
    <ul className="todo-list">
      {useFilteredTodoIDs(rep, visibilityFilter).map((id) => (
        <TodoItem rep={rep} id={id} key={id} />
      ))}
    </ul>
  );
};

export default TodoList;
