import React from "react";
import type { Replicache } from "replicache";
// import { useSubscribe } from "replicache-react";
import LeftMenu from "./left-menu";
import type { M } from "./mutators";
//import { getAllTodos } from "./todo";
import { useState } from "react";
import TopFilter from "./top-filter";
import IssueList from "./issue-list";

const App = ({ rep }: { rep: Replicache<M> }) => {
  const [menuVisible, setMenuVisible] = useState(false);
  rep = rep;
  // todo: will add this in when replicache sync is in place
  // const todos = useSubscribe(rep, getAllTodos, []);
  // const handleNewItem = (text: string) =>
  //   rep.mutate.putTodo({
  //     id: nanoid(),
  //     text,
  //     sort: todos.length > 0 ? todos[todos.length - 1].sort + 1 : 0,
  //     completed: false,
  //   });

  // const handleUpdateTodo = (id: string, text: string) =>
  //   rep.mutate.updateTodo({ id, changes: { text } });

  // const handleCompleteTodo = (id: string, completed: boolean) =>
  //   rep.mutate.updateTodo({ id, changes: { completed } });

  // const handleDeleteTodos = rep.mutate.deleteTodos;

  return (
    <div>
      <div className="flex w-full h-screen overflow-y-hidden">
        <LeftMenu
          menuVisible={menuVisible}
          onCloseMenu={() => setMenuVisible(false)}
        />
        <div className="flex flex-col flex-grow">
          <TopFilter
            onToggleMenu={() => setMenuVisible(!menuVisible)}
            title="All issues"
          />
          <IssueList />
        </div>
      </div>
    </div>
  );
};

export default App;
