import React from "react";
import { Replicache } from "replicache";
import { M } from "./mutators";
//import Footer from "./Footer";
import TodoList from "./todo-list";

const MainSection = ({ rep }: { rep: Replicache<M> }) => {
  //const todosCount = todos.length;
  //const completedCount = getCompletedCount(todos);
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
      <TodoList rep={rep} visibilityFilter={"all"} />
      {/*!!todosCount && (
        <Footer
          completedCount={completedCount}
          activeCount={todosCount - completedCount}
          onClearCompleted={clearCompletedTodos}
        />
      )*/}
    </section>
  );
};

export default MainSection;
