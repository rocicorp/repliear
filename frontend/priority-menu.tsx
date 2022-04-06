import React, { useState } from "react";
import { usePopper } from "react-popper";
import PriorityIcon from "./priority-icon";
import HighPriorityIcon from "./assets/icons/signal-strong.svg";
import LowPriorityIcon from "./assets/icons/signal-weak.svg";
import MediumPriorityIcon from "./assets/icons/signal-medium.svg";
import NoPriorityIcon from "./assets/icons/dots.svg";
import UrgentPriorityIcon from "./assets/icons/rounded-claim.svg";
import { Priority, PriorityEnum } from "./issue";

interface Props {
  labelVisible: boolean;
  onSelect: React.Dispatch<React.SetStateAction<Priority>>;
}

const PriorityMenu = ({ labelVisible, onSelect }: Props) => {
  const [priorityRef, setPriorityRef] = useState<HTMLButtonElement | null>(
    null
  );
  const [popperRef, setPopperRef] = useState<HTMLDivElement | null>(null);
  const [priorityDropDownVisible, setPriorityDropDownVisible] = useState(false);
  const [priority, setPriority] = useState(Priority.NONE);

  const { styles, attributes, update } = usePopper(priorityRef, popperRef, {
    placement: "bottom-start",
    strategy: "fixed",
  });

  const handleDropdownClick = () => {
    update && update();
    setPriorityDropDownVisible(!priorityDropDownVisible);
  };

  const getPriorityString = (priority: PriorityEnum) => {
    switch (priority) {
      case Priority.NONE:
        return "Priority";
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

  const statusOpts = [
    [NoPriorityIcon, "No priority", Priority.NONE],
    [UrgentPriorityIcon, "Urgent", Priority.URGENT],
    [HighPriorityIcon, "High", Priority.HIGH],
    [MediumPriorityIcon, "Medium", Priority.MEDIUM],
    [LowPriorityIcon, "Low", Priority.LOW],
  ];

  const options = statusOpts.map(([Icon, label, priority], idx) => {
    return (
      <div
        key={idx}
        className="flex items-center h-8 px-3 text-gray-500 focus:outline-none hover:text-gray-800 hover:bg-gray-100"
        onClick={() => {
          onSelect(priority);
          setPriority(priority);
          setPriorityDropDownVisible(false);
        }}
      >
        <Icon className="mr-3" /> <span>{label}</span>
      </div>
    );
  });

  return (
    <>
      <button
        className="inline-flex items-center h-6 px-2 text-gray-500 bg-gray-200 border-none rounded focus:outline-none hover:bg-gray-100 hover:text-gray-700"
        ref={setPriorityRef}
        onClick={handleDropdownClick}
      >
        <PriorityIcon priority={priority} className="mr-0.5" />
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
    </>
  );
};

export default PriorityMenu;
