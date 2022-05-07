import React, { MouseEvent, RefObject, useRef, useState } from "react";
import { usePopper } from "react-popper";
import StatusIcon from "./status-icon";
import CancelIcon from "./assets/icons/cancel.svg";
import BacklogIcon from "./assets/icons/circle-dot.svg";
import TodoIcon from "./assets/icons/circle.svg";
import DoneIcon from "./assets/icons/done.svg";
import InProgressIcon from "./assets/icons/half-circle.svg";
import { Status, StatusEnum } from "./issue";
import { useClickOutside } from "./hooks/useClickOutside";

interface Props {
  labelVisible?: boolean;
  onSelect: (status: Status) => void;
  status: Status;
}

export const statuses = [
  [BacklogIcon, Status.BACKLOG, "Backlog"],
  [TodoIcon, Status.TODO, "Todo"],
  [InProgressIcon, Status.IN_PROGRESS, "In Progress"],
  [DoneIcon, Status.DONE, "Done"],
  [CancelIcon, Status.CANCELED, "Canceled"],
];

const getStatusString = (status: StatusEnum) => {
  switch (status) {
    case Status.BACKLOG:
      return "Backlog";
    case Status.TODO:
      return "Todo";
    case Status.IN_PROGRESS:
      return "In Progress";
    case Status.DONE:
      return "Done";
    case Status.CANCELED:
      return "Canceled";
    default:
      return "Backlog";
  }
};

const StatusMenu = ({ labelVisible = false, onSelect, status }: Props) => {
  const [statusRef, setStatusRef] = useState<HTMLButtonElement | null>(null);
  const [popperRef, setPopperRef] = useState<HTMLDivElement | null>(null);
  const [statusDropDownVisible, setStatusDropDownVisible] = useState(false);

  const { styles, attributes, update } = usePopper(statusRef, popperRef, {
    placement: "bottom-start",
  });

  const ref = useRef<HTMLDivElement>() as RefObject<HTMLDivElement>;

  const handleDropdownClick = (e: MouseEvent) => {
    update && update();
    e.stopPropagation();
    setStatusDropDownVisible(!statusDropDownVisible);
  };

  useClickOutside(ref, () => {
    if (statusDropDownVisible) {
      setStatusDropDownVisible(false);
    }
  });

  const options = statuses.map(([Icon, status, label], idx) => {
    return (
      <div
        key={idx}
        className="flex items-center h-8 px-3 text-gray-500 focus:outline-none hover:text-gray-800 hover:bg-gray-100"
        onClick={(e: MouseEvent) => {
          onSelect(status);
          setStatusDropDownVisible(false);
          e.stopPropagation();
        }}
      >
        <Icon className="mr-3" />
        <span>{label}</span>
      </div>
    );
  });

  return (
    <div ref={ref}>
      <button
        className="inline-flex items-center h-6 px-2 border-none rounded focus:outline-none hover:bg-gray-400"
        ref={setStatusRef}
        onClick={handleDropdownClick}
      >
        <StatusIcon status={status} />
        {labelVisible && (
          <div className="ml-2 whitespace-nowrap">
            {getStatusString(status)}
          </div>
        )}
      </button>
      <div
        ref={setPopperRef}
        style={{
          ...styles.popper,
          display: statusDropDownVisible ? "" : "none",
        }}
        {...attributes.popper}
        className="cursor-default bg-white rounded shadow-modal z-100 w-34"
      >
        <div style={styles.offset}>{options}</div>
      </div>
    </div>
  );
};

export default StatusMenu;
