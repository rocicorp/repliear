import React, { RefObject, useRef, useState } from "react";
import { usePopper } from "react-popper";
import { Filter, Priority, Status } from "./issue";
import { useClickOutside } from "./hooks/useClickOutside";
import SignalStrongIcon from "./assets/icons/signal-strong.svg";
import TodoIcon from "./assets/icons/circle.svg";
import { statusOpts } from "./priority-menu";
import { statuses } from "./status-menu";
import { MenuItem } from "./menu-item";
interface Props {
  onSelectStatus: (filter: Status) => void;
  onSelectPriority: (filter: Priority) => void;
}

const FilterMenu = ({ onSelectStatus, onSelectPriority }: Props) => {
  const [filterRef, setFilterRef] = useState<HTMLButtonElement | null>(null);
  const [popperRef, setPopperRef] = useState<HTMLDivElement | null>(null);
  const [filter, setFilter] = useState<Filter | null>(null);
  const [filterDropDownVisible, setFilterDropDownVisible] = useState(false);

  const { styles, attributes, update } = usePopper(filterRef, popperRef, {
    placement: "bottom-start",
  });

  const ref = useRef<HTMLDivElement>() as RefObject<HTMLDivElement>;

  const handleDropdownClick = () => {
    update && update();
    setFilterDropDownVisible(!filterDropDownVisible);
  };

  useClickOutside(ref, () => {
    if (filterDropDownVisible) {
      setFilter(null);
      setFilterDropDownVisible(false);
    }
  });

  const filterBys = [
    [SignalStrongIcon, Filter.PRIORITY, "Priority"],
    [TodoIcon, Filter.STATUS, "Status"],
  ];

  const options = (filter: Filter | null) => {
    switch (filter) {
      case Filter.PRIORITY:
        return statusOpts.map(([icon, label, priority], idx) => (
          <MenuItem
            key={idx}
            icon={icon}
            onClick={() => {
              onSelectPriority(priority as Priority);
              setFilter(null);
              setFilterDropDownVisible(false);
            }}
            label={label}
          />
        ));

      case Filter.STATUS:
        return statuses.map(([icon, status, label], idx) => (
          <MenuItem
            key={idx}
            icon={icon}
            onClick={() => {
              onSelectStatus(status as Status);
              setFilter(null);
              setFilterDropDownVisible(false);
            }}
            label={label}
          />
        ));

      default:
        return filterBys.map(([icon, filter, label], idx) => (
          <MenuItem
            key={idx}
            icon={icon}
            onClick={() => {
              setFilter(filter as Filter);
            }}
            label={label}
          />
        ));
    }
  };

  return (
    <div ref={ref}>
      <button
        className="px-1 py-0.5 ml-3 border border-gray-600 border-dashed rounded text-white hover:text-gray-50 focus:outline-none"
        ref={setFilterRef}
        onClick={handleDropdownClick}
      >
        + Filter
      </button>
      <div
        ref={setPopperRef}
        style={{
          ...styles.popper,
          display: filterDropDownVisible ? "" : "none",
        }}
        {...attributes.popper}
        className="bg-white rounded shadow-modal z-100 w-34 overflow-hidden cursor-pointer"
      >
        <div style={styles.offset}>{options(filter)}</div>
      </div>
    </div>
  );
};

export default FilterMenu;
