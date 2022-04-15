import React, { ChangeEventHandler, useState } from "react";
import SearchIcon from "./assets/icons/search.svg";
import classnames from "classnames";

interface Props {
  placeholder: string;
  //onChange callback
  onChange?: ChangeEventHandler;
  className?: string;
}

function SearchBox({ placeholder = "Search", onChange, className }: Props) {
  const [focus, setFocus] = useState(false);
  return (
    <div className={classnames("relative", className)}>
      <input
        type="search"
        placeholder={placeholder}
        onChange={onChange}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        className="w-full pl-8 pr-6 text-sm font-medium placeholder-white text-white bg-gray-450 border-gray-400 border-transparent rounded h-7 ring-0 focus:outline-none"
      />
      <SearchIcon
        className={classnames("absolute w-3.5 h-3.5 text-white left-2 top-2", {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          "text-gray-100": focus,
        })}
      />
    </div>
  );
}

export default SearchBox;
