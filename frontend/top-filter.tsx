import MenuIcon from "./assets/icons/menu.svg";
import React, { useState } from "react";
//import type { Issue } from "./issue";

import IssueFilterModal from "./issue-filter-modal";
import SortOrderMenu from "./sort-order-menu";
import { useQueryState } from "next-usequerystate";
import FilterMenu from "./filter-menu";
interface Props {
  title: string;
  onToggleMenu?: () => void;
  issuesCount: number;
}

const TopFilter = ({ title, onToggleMenu, issuesCount }: Props) => {
  const [filterVisible, setFilterVisible] = useState(false);
  const [, setOrderByParam] = useQueryState("orderBy");
  const [, setFilterByParam] = useQueryState("filter");

  return (
    <>
      <div className="flex justify-between flex-shrink-0 pl-2 pr-6 border-b border-gray-400 h-14 lg:pl-9 border-b-color-gray-2">
        {/* left section */}
        <div className="flex items-center">
          <button
            className="flex-shrink-0 h-full px-5 focus:outline-none lg:hidden"
            onClick={onToggleMenu}
          >
            <MenuIcon className="w-3.5 text-white hover:text-gray-2" />
          </button>

          <div className="p-1 font-semibold cursor-default hover:bg-gray-450">
            {title}
          </div>
          <span>{issuesCount}</span>
          <FilterMenu onSelect={(filter) => setFilterByParam(filter.toLocaleString())} />
        </div>

        {/* right section */}
        <div className="flex items-center">
          <SortOrderMenu
            onSelect={(orderBy) => setOrderByParam(orderBy.toLocaleString())}
          />
        </div>
      </div>
      <IssueFilterModal
        isOpen={filterVisible}
        onDismiss={() => setFilterVisible(false)}
      />
    </>
  );
};

export default TopFilter;
