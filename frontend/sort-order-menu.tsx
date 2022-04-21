import React, { RefObject, useRef, useState } from "react";
import { usePopper } from "react-popper";
import { Order } from "./issue";
import { useClickOutside } from "./hooks/useClickOutside";
import SortOutlinedIcon from "@mui/icons-material/SortOutlined";

interface Props {
  onSelect: (orderBy: Order) => void;
}

const SortOrderMenu = ({ onSelect }: Props) => {
  const [orderRef, setOrderRef] = useState<HTMLButtonElement | null>(null);
  const [popperRef, setPopperRef] = useState<HTMLDivElement | null>(null);
  const [orderByDropDownVisible, setOrderByDropDownVisible] = useState(false);

  const { styles, attributes, update } = usePopper(orderRef, popperRef, {
    placement: "bottom-start",
  });

  const ref = useRef<HTMLDivElement>() as RefObject<HTMLDivElement>;

  const handleDropdownClick = () => {
    update && update();
    setOrderByDropDownVisible(!orderByDropDownVisible);
  };

  useClickOutside(ref, () => {
    if (orderByDropDownVisible) {
      setOrderByDropDownVisible(false);
    }
  });

  const orderedBys = [
    [Order.CREATED, "Created Date"],
    [Order.MODIFIED, "Last Modified"],
  ];

  const options = orderedBys.map(([order, label], idx) => {
    return (
      <div
        key={idx}
        className="flex items-center h-8 px-3 text-gray-500 focus:outline-none hover:text-gray-800 hover:bg-gray-100"
        onClick={() => {
          onSelect(order as Order);
          setOrderByDropDownVisible(false);
        }}
      >
        {label}
      </div>
    );
  });

  return (
    <div ref={ref}>
      <button
        className="flex items-center justify-center w-6 h-6 border-none rounded focus:outline-none hover:bg-gray-100"
        ref={setOrderRef}
        onClick={handleDropdownClick}
      >
        <SortOutlinedIcon />
      </button>
      <div
        ref={setPopperRef}
        style={{
          ...styles.popper,
          display: orderByDropDownVisible ? "" : "none",
        }}
        {...attributes.popper}
        className="cursor-default bg-white rounded shadow-modal z-100 w-34"
      >
        <div style={styles.offset}>{options}</div>
      </div>
    </div>
  );
};

export default SortOrderMenu;