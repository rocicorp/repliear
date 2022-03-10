import React from "react";
import TodoTextInput from "./todo-text-input";

const Header = ({ onNewItem }: { onNewItem: (text: string) => void }) => (
  <header className="header">
    <h1>todos</h1>
    <TodoTextInput
      initial=""
      placeholder="What needs to be done?"
      onSubmit={onNewItem}
    />
  </header>
);

export default Header;
