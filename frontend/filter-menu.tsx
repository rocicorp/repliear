import React, { RefObject, useRef, useState } from "react";
import { usePopper } from "react-popper";
import { Filter, Priority, Status } from "./issue";
import { useClickOutside } from "./hooks/useClickOutside";
import SignalStrongIcon from "./assets/icons/signal-strong.svg";
import TodoIcon from "./assets/icons/circle.svg";
import { statusOpts } from "./priority-menu";
import { statuses } from "./status-menu";
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

  //
  const options = (filter: Filter | null) => {
    switch (filter) {
      case Filter.PRIORITY:
        return statusOpts.map(([Icon, label, priority], idx) => {
          return (
            <div
              key={idx}
              className="flex items-center h-8 px-3 text-gray focus:outline-none hover:text-gray-800 hover:bg-gray-300"
              onMouseDown={() => {
                onSelectPriority(priority as Priority);
                setFilter(null);
                setFilterDropDownVisible(false);
              }}
            >
              <Icon className="mr-4" />
              {label}
            </div>
          );
        });

      case Filter.STATUS:
        return statuses.map(([Icon, status, label], idx) => {
          return (
            <div
              key={idx}
              className="flex items-center h-8 px-3 text-gray focus:outline-none hover:text-gray-800 hover:bg-gray-300"
              onMouseDown={() => {
                onSelectStatus(status as Status);
                setFilter(null);
                setFilterDropDownVisible(false);
              }}
            >
              <Icon className="mr-4" />
              {label}
            </div>
          );
        });
      default:
        return filterBys.map(([Icon, filter, label], idx) => {
          return (
            <div
              key={idx}
              className="flex items-center h-8 px-3 text-gray focus:outline-none hover:text-gray-800 hover:bg-gray-300"
              onMouseDown={() => {
                setFilter(filter as Filter);
              }}
            >
              <Icon className="mr-4" />
              {label}
            </div>
          );
        });
    }
  };

  return (
    <div ref={ref}>
      <button
        className="px-1 py-0.5 ml-3 border border-gray-600 border-dashed rounded text-white hover:text-gray-50 focus:outline-none"
        ref={setFilterRef}
        onMouseDown={handleDropdownClick}
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
        className="cursor-default bg-white rounded shadow-modal z-100 w-34"
      >
        <div style={styles.offset}>{options(filter)}</div>
      </div>
    </div>
  );
};

export default FilterMenu;
