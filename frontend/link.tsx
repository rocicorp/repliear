import React from "react";
import classnames from "classnames";

const Link = ({
  children,
  selected,
  onClick,
}: {
  children: any;
  selected: boolean;
  onClick: () => void;
}) => {
  return (
    <a
      className={classnames({ selected })}
      style={{ cursor: "pointer" }}
      onClick={() => onClick()}
    >
      {children}
    </a>
  );
};

export default Link;
