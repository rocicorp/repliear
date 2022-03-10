import React, { useState } from "react";
import classnames from "classnames";
import { Todo } from "./todo";
import TodoTextInput from "./todo-text-input";

export function TodoItem({
  todo,
  onUpdate,
  onComplete,
  onDelete,
}: {
  todo: Todo;
  onUpdate: (text: string) => void;
  onComplete: (completed: boolean) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);

  const handleDoubleClick = () => {
    setEditing(true);
  };

  const handleSave = (text: string) => {
    if (text.length === 0) {
      onDelete();
    } else {
      onUpdate(text);
    }
    setEditing(false);
  };

  let element;
  if (editing) {
    element = (
      <TodoTextInput
        initial={todo.text}
        onSubmit={handleSave}
        onBlur={handleSave}
      />
    );
  } else {
    element = (
      <div className="view">
        <input
          className="toggle"
          type="checkbox"
          checked={todo.completed}
          onChange={() => onComplete(!todo.completed)}
        />
        <label onDoubleClick={handleDoubleClick}>{todo.text}</label>
        <button className="destroy" onClick={() => onDelete()} />
      </div>
    );
  }

  return (
    <li
      className={classnames({
        completed: todo.completed,
        editing,
      })}
    >
      {element}
    </li>
  );
}
