import CancelIcon from "./assets/icons/cancel.svg";
import BacklogIcon from "./assets/icons/circle-dot.svg";
import TodoIcon from "./assets/icons/circle.svg";
import DoneIcon from "./assets/icons/done.svg";
import InProgressIcon from "./assets/icons/half-circle.svg";
import classNames from "classnames";
import React from "react";
import { StatusEnum } from "./issue";

interface Props {
  status: StatusEnum;
  className?: string;
}

const statusIcons = {
  [StatusEnum.enum.BACKLOG]: BacklogIcon,
  [StatusEnum.enum.TODO]: TodoIcon,
  [StatusEnum.enum.IN_PROGRESS]: InProgressIcon,
  [StatusEnum.enum.DONE]: DoneIcon,
  [StatusEnum.enum.CANCELED]: CancelIcon,
};

export default function StatusIcon({ status, className }: Props) {
  let classes = classNames("w-3.5 h-3.5 rounded", className);

  return <img src={statusIcons[status]} className={classes} />;
}
