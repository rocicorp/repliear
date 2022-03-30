import SignalUrgentIcon from "./assets/icons/claim.svg";
import SignalNoPriorityIcon from "./assets/icons/dots.svg";
import SignalMediumIcon from "./assets/icons/signal-medium.svg";
import SignalStrongIcon from "./assets/icons/signal-strong.svg";
import SignalWeakIcon from "./assets/icons/signal-weak.svg";
import classNames from "classnames";
import React from "react";
import type { PriorityEnum as PriorityType } from "./issue";
import { PriorityEnum } from "./issue";

interface Props {
  priority: PriorityType;
  className?: string;
}

const ICONS = {
  [PriorityEnum.enum.HIGH]: SignalStrongIcon,
  [PriorityEnum.enum.MEDIUM]: SignalMediumIcon,
  [PriorityEnum.enum.LOW]: SignalWeakIcon,
  [PriorityEnum.enum.URGENT]: SignalUrgentIcon,
  [PriorityEnum.enum.NONE]: SignalNoPriorityIcon,
};

export default function PriorityIcon({ priority, className }: Props) {
  let classes = classNames("w-3.5 h-3.5 rounded", className);

  let Icon = ICONS[priority];

  return <Icon className={classes} />;
}
