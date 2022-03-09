import React from "react";
import { Replicache } from "replicache";
import { M } from "./mutators";
import TodoTextInput from "./todo-text-input";

const Header = ({ rep }: { rep: Replicache<M> }) => (
  <header className="header">
    <h1>todos</h1>
    <TodoTextInput rep={rep} />
  </header>
);

export default Header;
