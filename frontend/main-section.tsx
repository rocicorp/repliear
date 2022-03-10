import React, { useState } from "react";
import { Todo } from "./todo";
import Footer from "./footer";
import TodoList from "./todo-list";

const MainSection = ({
  todos,
  onUpdateTodo,
  onCompleteTodo,
  onDeleteTodos,
}: {
  todos: Todo[];
  onUpdateTodo: (id: string, text: string) => void;
  onCompleteTodo: (id: string, completed: boolean) => void;
  onDeleteTodos: (ids: string[]) => void;
}) => {
  const todosCount = todos.length;
  const completed = todos.filter((todo) => todo.completed);
  const completedCount = completed.length;

  const [filter, setFilter] = useState("All");

  const filteredTodos = todos.filter((todo) => {
    if (filter === "All") {
      return true;
    }
    if (filter === "Active") {
      return !todo.completed;
    }
    if (filter === "Completed") {
      return todo.completed;
    }
    throw new Error("Unknown filter: " + filter);
  });

  return (
    <section className="main">
      {/*!!todosCount && (
        <span>
          <input
            className="toggle-all"
            type="checkbox"
            defaultChecked={completedCount === todosCount}
          />
          <label onClick={completeAllTodos} />
        </span>
      )*/}
      <TodoList
        todos={filteredTodos}
        onUpdateTodo={onUpdateTodo}
        onCompleteTodo={onCompleteTodo}
        onDeleteTodo={(id) => onDeleteTodos([id])}
      />
      {todos.length > 0 && (
        <Footer
          completed={completedCount}
          active={todosCount - completedCount}
          onDeleteCompleted={() =>
            onDeleteTodos(completed.map((todo) => todo.id))
          }
          currentFilter={filter}
          onFilter={setFilter}
        />
      )}
    </section>
  );
};

export default MainSection;
