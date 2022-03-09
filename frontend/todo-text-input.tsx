import React, {
  ChangeEvent,
  Component,
  FocusEvent,
  FocusEventHandler,
  KeyboardEvent,
  useRef,
  useState,
} from "react";
import PropTypes from "prop-types";
import classnames from "classnames";
import { M } from "./mutators";
import { Replicache } from "replicache";
import { nanoid } from "nanoid";

export default function TodoTextInput({ rep }: { rep: Replicache<M> }) {
  const [textInput, setTextInput] = useState("");
  const ref = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && ref.current) {
      rep.mutate.addTodo({ id: nanoid(), text: textInput });
      setTextInput("");
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setTextInput(e.target.value);
  };

  const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
    //if editing
    //onSave(ref.current.value);
  };

  return (
    <input
      ref={ref}
      className={classnames({
        edit: false,
        "new-todo": true,
      })}
      type="text"
      placeholder="What needs to be done?"
      autoFocus={true}
      value={textInput}
      onBlur={handleBlur}
      onChange={handleChange}
      onKeyDown={handleSubmit}
    />
  );
}
