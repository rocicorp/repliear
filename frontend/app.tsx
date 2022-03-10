import { nanoid } from "nanoid";
import React from "react";
import { Replicache } from "replicache";
import { useSubscribe } from "replicache-react";
import Header from "./header";
import MainSection from "./main-section";
import { M } from "./mutators";
import { getAllTodos } from "./todo";

const App = ({ rep }: { rep: Replicache<M> }) => {
  const todos = useSubscribe(rep, getAllTodos, []);

  const handleNewItem = (text: string) =>
    rep.mutate.putTodo({
      id: nanoid(),
      text,
      sort: todos.length > 0 ? todos[todos.length - 1].sort + 1 : 0,
      completed: false,
    });

  const handleUpdateTodo = (id: string, text: string) =>
    rep.mutate.updateTodo({ id, changes: { text } });

  const handleCompleteTodo = (id: string, completed: boolean) =>
    rep.mutate.updateTodo({ id, changes: { completed } });

  const handleDeleteTodos = rep.mutate.deleteTodos;

  return (
    <div>
      <Header onNewItem={handleNewItem} />
      <MainSection
        todos={todos}
        onUpdateTodo={handleUpdateTodo}
        onCompleteTodo={handleCompleteTodo}
        onDeleteTodos={handleDeleteTodos}
      />
    </div>
  );
};

export default App;
