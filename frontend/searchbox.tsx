import React, { ChangeEventHandler, useState, useCallback } from "react";
import SearchIcon from "./assets/icons/search.svg";
import classnames from "classnames";
import { Input } from "./input";

interface Props {
  placeholder?: string;
  onChange?: ChangeEventHandler;
  className?: string;
}

export const SearchBox: React.FC<Props> = ({
  placeholder = "Search",
  onChange,
  className,
}) => {
  const [isFocused, setFocus] = useState(false);

  const onFocus = (newFocus: boolean) =>
    useCallback(() => setFocus(newFocus), []);

  return (
    <div className={classnames("relative", className)}>
      <Input
        icon={SearchIcon}
        placeholder={placeholder}
        onChange={onChange}
        onFocus={onFocus(true)}
        onBlur={onFocus(false)}
      />
      <div
        style={{ ...(isFocused ? {} : { display: "none" }) }}
        className="text-gray-50 absolute bg-blue rounded shadow-modal z-100 w-34 p-2 cursor-pointer"
      >
        <a href="https://github.com/rocicorp/repliear/issues/29">
          The search feature is coming soon ...
        </a>
      </div>
    </div>
  );
};
