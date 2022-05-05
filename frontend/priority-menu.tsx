import React, { MouseEvent, RefObject, useRef, useState } from "react";
import { usePopper } from "react-popper";
import PriorityIcon from "./priority-icon";
import HighPriorityIcon from "./assets/icons/signal-strong.svg";
import LowPriorityIcon from "./assets/icons/signal-weak.svg";
import MediumPriorityIcon from "./assets/icons/signal-medium.svg";
import NoPriorityIcon from "./assets/icons/dots.svg";
import UrgentPriorityIcon from "./assets/icons/rounded-claim.svg";
import { Priority, PriorityEnum } from "./issue";
import { useClickOutside } from "./hooks/useClickOutside";
import classnames from "classnames";

interface Props {
  labelVisible?: boolean;
  wideMode?: boolean;
  onSelect: (priority: Priority) => void;
  priority: Priority;
}

export const statusOpts = [
  [NoPriorityIcon, "No priority", Priority.NONE],
  [UrgentPriorityIcon, "Urgent", Priority.URGENT],
  [HighPriorityIcon, "High", Priority.HIGH],
  [MediumPriorityIcon, "Medium", Priority.MEDIUM],
  [LowPriorityIcon, "Low", Priority.LOW],
];

const PriorityMenu = ({
  labelVisible,
  wideMode,
  onSelect,
  priority = Priority.NONE,
}: Props) => {
  const [priorityRef, setPriorityRef] = useState<HTMLButtonElement | null>(
    null
  );
  const [popperRef, setPopperRef] = useState<HTMLDivElement | null>(null);
  const [priorityDropDownVisible, setPriorityDropDownVisible] = useState(false);
  const ref = useRef<HTMLDivElement>() as RefObject<HTMLDivElement>;

  const { styles, attributes, update } = usePopper(priorityRef, popperRef, {
    placement: "bottom-start",
  });

  const handleDropdownClick = (e: MouseEvent) => {
    update && update();
    e.stopPropagation();
    setPriorityDropDownVisible(!priorityDropDownVisible);
  };

  const getPriorityString = (priority: PriorityEnum) => {
    switch (priority) {
      case Priority.NONE:
        return "None";
      case Priority.HIGH:
        return "High";
      case Priority.MEDIUM:
        return "Medium";
      case Priority.LOW:
        return "Low";
      case Priority.URGENT:
        return "Urgent";
      default:
        return "Priority";
    }
  };

  useClickOutside(ref, () => {
    if (priorityDropDownVisible) {
      setPriorityDropDownVisible(false);
    }
  });

  const classes = classnames(
    "inline-flex items-center h-6 px-2 border-none rounded focus:outline-none",
    {
      /* eslint-disable @typescript-eslint/naming-convention */
      "text-gray-2 hover:bg-gray-400 hover:text-gray-2": !labelVisible,
      "text-md hover:bg-gray-400 hover:text-gray-2": wideMode || labelVisible,
      /* eslint-enable @typescript-eslint/naming-convention */
    }
  );

  const options = statusOpts.map(([Icon, label, priority], idx) => {
    return (
      <div
        key={idx}
        className="flex items-center h-8 px-3 text-gray-500 focus:outline-none hover:text-gray-800 hover:bg-gray-100"
        onClick={() => {
          onSelect(priority);
          setPriorityDropDownVisible(false);
        }}
      >
        <Icon className="mr-3" /> <span>{label}</span>
      </div>
    );
  });

  return (
    <div ref={ref}>
      <button
        className={classes}
        ref={setPriorityRef}
        onClick={handleDropdownClick}
      >
        <PriorityIcon
          priority={priority}
          className={wideMode ? "mr-2" : "mr-0.5"}
        />
        {labelVisible && <span>{getPriorityString(priority)}</span>}
      </button>
      <div
        ref={setPopperRef}
        style={{
          ...styles.popper,
          display: priorityDropDownVisible ? "" : "none",
        }}
        {...attributes.popper}
        className="cursor-default bg-white rounded shadow-modal z-100 w-34"
      >
        <div style={styles.offset}>{options}</div>
      </div>
    </div>
  );
};

export default PriorityMenu;
