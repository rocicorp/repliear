import React, { Component } from "react";
import classnames from "classnames";
import { Replicache } from "replicache";
import { M } from "./mutators";
import { useTodo } from "./subscriptions";
//import TodoTextInput from "./TodoTextInput";

export function TodoItem({ rep, id }: { rep: Replicache<M>; id: string }) {
  /*
  state = {
    editing: false,
  };

  handleDoubleClick = () => {
    this.setState({ editing: true });
  };

  handleSave = (id, text) => {
    if (text.length === 0) {
      deleteTodo(id);
    } else {
      editTodo(id, text);
    }
    this.setState({ editing: false });
  };
  */

  const todo = useTodo(rep, id);
  if (!todo) {
    return null;
  }
  /*
    let element;
    if (this.state.editing) {
      element = (
        <TodoTextInput
          text={todo.text}
          editing={this.state.editing}
          onSave={(text) => this.handleSave(todo.id, text)}
        />
      );
    } else {
      */
  const element = (
    <div className="view">
      <input
        className="toggle"
        type="checkbox"
        checked={todo.completed}
        onChange={() =>
          rep.mutate.completeTodo({ id, completed: !todo.completed })
        }
      />
      <label
        onDoubleClick={() => {
          /*handleDoubleClick*/
        }}
      >
        {todo.text}
      </label>
      <button className="destroy" onClick={() => rep.mutate.deleteTodo(id)} />
    </div>
  );

  return (
    <li
      className={classnames({
        completed: todo.completed,
        editing: false, //this.state.editing,
      })}
    >
      {element}
    </li>
  );
}
