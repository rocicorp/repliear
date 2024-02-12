import React, { memo, MouseEvent, RefObject, useRef, useState } from "react";
import { usePopper } from "react-popper";
import PriorityIcon from "./priority-icon";
import HighPriorityIcon from "./assets/icons/signal-strong.svg";
import LowPriorityIcon from "./assets/icons/signal-weak.svg";
import MediumPriorityIcon from "./assets/icons/signal-medium.svg";
import NoPriorityIcon from "./assets/icons/dots.svg";
import UrgentPriorityIcon from "./assets/icons/rounded-claim.svg";
import { Priority, PriorityEnum } from "./issue";
import { useClickOutside } from "./hooks/useClickOutside";
import { MenuItem } from "./menu-item";
import { Flex, IconButton, Text } from "@radix-ui/themes";

interface Props {
  labelVisible?: boolean;
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
  onSelect,
  priority = Priority.NONE,
}: Props) => {
  const [buttonRef, setButtonRef] = useState<HTMLButtonElement | null>(null);
  const [priorityDropDownVisible, setPriorityDropDownVisible] = useState(false);
  const ref = useRef<HTMLDivElement>() as RefObject<HTMLDivElement>;

  const handleDropdownClick = (e: MouseEvent) => {
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

  const priorityColor = {
    [Priority.NONE]: "gray",
    [Priority.HIGH]: "orange",
    [Priority.MEDIUM]: "yellow",
    [Priority.LOW]: "green",
    [Priority.URGENT]: "red",
  } as const;

  useClickOutside(ref, () => {
    if (priorityDropDownVisible) {
      setPriorityDropDownVisible(false);
    }
  });

  const options = statusOpts.map(([icon, label, priority], idx) => (
    <MenuItem
      key={idx}
      onClick={(e: MouseEvent) => {
        onSelect(priority);
        setPriorityDropDownVisible(false);
        e.stopPropagation();
      }}
      icon={icon}
      label={label}
    />
  ));

  return (
    <Flex ref={ref} height="8" align="center" gap="4">
      <IconButton
        ref={setButtonRef}
        onClick={handleDropdownClick}
        color={priorityColor[priority]}
        variant="ghost"
        className="cursor-pointer"
      >
        <PriorityIcon priority={priority} />
      </IconButton>
      {priorityDropDownVisible && (
        <Popper buttonRef={buttonRef}>{options}</Popper>
      )}
      {labelVisible && (
        <Text className="align">{getPriorityString(priority)}</Text>
      )}
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

export default memo(PriorityMenu);
