import CancelIcon from "./assets/icons/cancel.svg";
import BacklogIcon from "./assets/icons/circle-dot.svg";
import TodoIcon from "./assets/icons/circle.svg";
import DoneIcon from "./assets/icons/done.svg";
import InProgressIcon from "./assets/icons/half-circle.svg";
import classNames from "classnames";
import React from "react";
import { StatusEnum, Status } from "./issue";

interface Props {
  status: StatusEnum;
  className?: string;
}

const statusIcons: Record<StatusEnum, any> = {
  [Status.BACKLOG]: BacklogIcon,
  [Status.TODO]: TodoIcon,
  [Status.IN_PROGRESS]: InProgressIcon,
  [Status.DONE]: DoneIcon,
  [Status.CANCELED]: CancelIcon,
};

export default function StatusIcon({ status, className }: Props) {
  const classes = classNames("w-3.5 h-3.5 rounded", className);

  return <img src={statusIcons[status]} className={classes} />;
}
