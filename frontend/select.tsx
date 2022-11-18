import classNames from "classnames";
import React, { ReactNode } from "react";

interface Props {
  className?: string;
  children: ReactNode;
  defaultValue?: string | number | ReadonlyArray<string>;
}
export default function Select(props: Props) {
  const { children, defaultValue = "", className, ...rest } = props;

  const classes = classNames(
    "form-select text-xs focus:ring-transparent form-select text-gray-800 h-6 bg-gray-300 rounded pr-4.5 bg-right pl-2 py-0 appearance-none focus:outline-none border-none",
    className
  );
  return (
    <select {...rest} defaultValue={defaultValue} className={classes}>
      {children}
    </select>
  );
}
