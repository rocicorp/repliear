import React from "react";
import { Todo } from "./todo";
import { TodoItem } from "./todo-item";

const TodoList = ({
  todos,
  onUpdateTodo,
  onCompleteTodo,
  onDeleteTodo,
}: {
  todos: Todo[];
  onUpdateTodo: (id: string, text: string) => void;
  onCompleteTodo: (id: string, completed: boolean) => void;
  onDeleteTodo: (id: string) => void;
}) => {
  return (
    <ul className="todo-list">
      {todos.map((todo) => (
        <TodoItem
          todo={todo}
          key={todo.id}
          onUpdate={(text) => onUpdateTodo(todo.id, text)}
          onComplete={(complete) => onCompleteTodo(todo.id, complete)}
          onDelete={() => onDeleteTodo(todo.id)}
        />
      ))}
    </ul>
  );
};

export default TodoList;
