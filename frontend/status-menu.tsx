import React, { useState } from "react";
import { usePopper } from "react-popper";
import StatusIcon from "./status-icon";
import CancelIcon from "./assets/icons/cancel.svg";
import BacklogIcon from "./assets/icons/circle-dot.svg";
import TodoIcon from "./assets/icons/circle.svg";
import DoneIcon from "./assets/icons/done.svg";
import InProgressIcon from "./assets/icons/half-circle.svg";
import { Status } from "./issue";

interface Props {
  onSelect: (status: Status) => void;
  status: Status;
}

const StatusMenu = ({ onSelect, status }: Props) => {
  const [statusRef, setStatusRef] = useState<HTMLButtonElement | null>(null);
  const [popperRef, setPopperRef] = useState<HTMLDivElement | null>(null);
  const [statusDropDownVisible, setStatusDropDownVisible] = useState(false);

  const { styles, attributes, update } = usePopper(statusRef, popperRef, {
    placement: "bottom-start",
  });

  const handleDropdownClick = () => {
    update && update();
    setStatusDropDownVisible(!statusDropDownVisible);
  };

  const statuses = [
    [BacklogIcon, Status.BACKLOG, "Backlog"],
    [TodoIcon, Status.TODO, "Todo"],
    [InProgressIcon, Status.IN_PROGRESS, "In Progress"],
    [DoneIcon, Status.DONE, "Done"],
    [CancelIcon, Status.CANCELED, "Canceled"],
  ];

  const options = statuses.map(([Icon, status, label], idx) => {
    return (
      <div
        key={idx}
        className="flex items-center h-8 px-3 text-gray-500 focus:outline-none hover:text-gray-800 hover:bg-gray-100"
        onClick={() => {
          onSelect(status);
          setStatusDropDownVisible(false);
        }}
      >
        <Icon className="mr-3" /> <span>{label}</span>
      </div>
    );
  });

  return (
    <>
      <button
        className="flex items-center justify-center w-6 h-6 border-none rounded focus:outline-none hover:bg-gray-100"
        ref={setStatusRef}
        onClick={handleDropdownClick}
      >
        <StatusIcon status={status} />
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
    </>
  );
};

export default StatusMenu;
