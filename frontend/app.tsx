import { nanoid } from "nanoid";
import React from "react";
import { Replicache } from "replicache";
import { useSubscribe } from "replicache-react";
import LeftMenu from "./left-menu";
import { M } from "./mutators";
import { getAllTodos } from "./todo";
import { useState } from "react";

const App = ({ rep }: { rep: Replicache<M> }) => {
  const todos = useSubscribe(rep, getAllTodos, []);
  const [showMenu, setShowMenu] = useState(false);
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
      <div className="flex w-full h-screen overflow-y-hidden">
        <LeftMenu showMenu={showMenu} onCloseMenu={() => setShowMenu(false)} />
        Left Menu
        <div className="flex flex-col flex-grow">
          TopFilter
          {/* <TopFilter
            onOpenMenu={() => setShowMenu(!showMenu)}
            title="All issues"
          />
          <IssueList /> */}
        </div>
      </div>
    </div>
  );
};

export default App;
