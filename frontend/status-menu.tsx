import React, { memo, MouseEvent, RefObject, useRef, useState } from "react";
import { usePopper } from "react-popper";
import StatusIcon from "./status-icon";
import CancelIcon from "./assets/icons/cancel.svg";
import BacklogIcon from "./assets/icons/circle-dot.svg";
import TodoIcon from "./assets/icons/circle.svg";
import DoneIcon from "./assets/icons/done.svg";
import InProgressIcon from "./assets/icons/half-circle.svg";
import { Status, StatusEnum } from "./issue";
import { useClickOutside } from "./hooks/useClickOutside";
import { MenuItem } from "./menu-item";
import { Flex, IconButton, Text } from "@radix-ui/themes";

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
  const [buttonRef, setButtonRef] = useState<HTMLButtonElement | null>(null);
  const [statusDropDownVisible, setStatusDropDownVisible] = useState(false);

  const ref = useRef<HTMLDivElement>() as RefObject<HTMLDivElement>;

  const handleDropdownClick = (e: MouseEvent) => {
    e.stopPropagation();
    setStatusDropDownVisible(!statusDropDownVisible);
  };

  useClickOutside(ref, () => {
    if (statusDropDownVisible) {
      setStatusDropDownVisible(false);
    }
  });

  const options = statuses.map(([icon, status, label], idx) => (
    <MenuItem
      key={idx}
      icon={icon}
      onClick={(e: MouseEvent) => {
        onSelect(status);
        setStatusDropDownVisible(false);
        e.stopPropagation();
      }}
      label={label}
    />
  ));

  return (
    <Flex ref={ref} className="ml-0.5" height="8" align="center" gap="4">
      <IconButton
        ref={setButtonRef}
        onClick={handleDropdownClick}
        variant="ghost"
        className="cursor-pointer"
      >
        <StatusIcon status={status} />
      </IconButton>
      {statusDropDownVisible && (
        <Popper buttonRef={buttonRef}>{options}</Popper>
      )}
      {labelVisible && <Text className="align">{getStatusString(status)}</Text>}
    </Flex>
  );
};

const Popper = ({
  buttonRef,
  children,
}: {
  buttonRef: HTMLButtonElement | null;
  children: React.ReactNode;
}) => {
  const [popperRef, setPopperRef] = useState<HTMLDivElement | null>(null);

  const { styles, attributes } = usePopper(buttonRef, popperRef, {
    placement: "bottom-start",
  });

  return (
    <div
      ref={setPopperRef}
      style={{
        ...styles.popper,
      }}
      {...attributes.popper}
      className="bg-white rounded shadow-modal z-100 w-34 overflow-hidden cursor-pointer"
    >
      <div style={styles.offset}>{children}</div>
    </div>
  );
};

export default memo(StatusMenu);
