import React, { RefObject, useRef, useState } from "react";
import { usePopper } from "react-popper";
import { Filter } from "./issue";
import { useClickOutside } from "./hooks/useClickOutside";
import SignalStrongIcon from "./assets/icons/signal-strong.svg";
import TodoIcon from "./assets/icons/circle.svg";
interface Props {
  onSelect: (filter: Filter) => void;
}

const FilterMenu = ({ onSelect }: Props) => {
  const [filterRef, setFilterRef] = useState<HTMLButtonElement | null>(null);
  const [popperRef, setPopperRef] = useState<HTMLDivElement | null>(null);
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
      setFilterDropDownVisible(false);
    }
  });

  const filterBys = [
    [SignalStrongIcon, Filter.PRIORITY, "Priority"],
    [TodoIcon, Filter.STATUS, "Status"],
  ];

  const options = () => {
    
    filterBys.map(([Icon, filter, label], idx) => {
      return (
        <div
          key={idx}
          className="flex items-center h-8 px-3 text-gray-500 focus:outline-none hover:text-gray-800 hover:bg-gray-100"
          onClick={() => {
            onSelect(filter as Filter);
            setFilterDropDownVisible(false);
          }}
        >
          <Icon />
          {label}
        </div>
      );
    });
  };

  return (
    <div ref={ref}>
      <button
        className="px-1 py-0.5 ml-3 border border-gray-3 border-dashed rounded text-white hover:text-gray-2 focus:outline-none"
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
        className="cursor-default bg-white rounded shadow-modal z-100 w-34"
      >
        <div style={styles.offset}>{options}</div>
      </div>
    </div>
  );
};

export default FilterMenu;
