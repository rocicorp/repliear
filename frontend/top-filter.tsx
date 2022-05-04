import MenuIcon from "./assets/icons/menu.svg";
import React from "react";

import SortOrderMenu from "./sort-order-menu";
import { queryTypes, useQueryState } from "next-usequerystate";
import FilterMenu from "./filter-menu";
import { Order, Priority, Status } from "./issue";

interface Props {
  title: string;
  onToggleMenu?: () => void;
  filteredIssuesCount?: number;
  issuesCount: number;
  showSortOrderMenu: boolean;
}

interface FilterStatusProps {
  filter: Status[] | Priority[] | null;
  onDelete: () => void;
  label: string;
}

const displayStrings: Record<Priority | Status, string> = {
  [Priority.NONE]: "None",
  [Priority.LOW]: "Low",
  [Priority.MEDIUM]: "Medium",
  [Priority.HIGH]: "High",
  [Priority.URGENT]: "Urgent",

  [Status.BACKLOG]: "Backlog",
  [Status.TODO]: "Todo",
  [Status.IN_PROGRESS]: "In Progress",
  [Status.DONE]: "Done",
  [Status.CANCELED]: "Canceled",
};

const FilterStatus = ({ filter, onDelete, label }: FilterStatusProps) => {
  if (!filter || filter.length === 0) return null;
  return (
    <div className="flex items-center pl-4 space-x-[1px]">
      <span className="px-1 text-gray-2 bg-gray-400 rounded-l">{label} is</span>
      <span className="px-1 text-gray-2 bg-gray-400 ">
        {filter.map((f) => displayStrings[f]).join(", ")}
      </span>
      <span
        className="px-1 text-gray-2 bg-gray-400 rounded-r cursor-pointer"
        onClick={onDelete}
      >
        &times;
      </span>
    </div>
  );
};

const TopFilter = ({
  title,
  onToggleMenu,
  filteredIssuesCount,
  issuesCount,
  showSortOrderMenu,
}: Props) => {
  const [orderBy, setOrderByParam] = useQueryState(
    "orderBy",
    queryTypes.stringEnum<Order>(Object.values(Order))
  );
  const [statusFilters, setStatusFilterByParam] = useQueryState(
    "statusFilter",
    queryTypes.array<Status>(
      queryTypes.stringEnum<Status>(Object.values(Status))
    )
  );
  const [priorityFilters, setPriorityFilterByParam] = useQueryState(
    "priorityFilter",
    queryTypes.array<Priority>(
      queryTypes.stringEnum<Priority>(Object.values(Priority))
    )
  );

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
          {filteredIssuesCount ? (
            <span>
              {filteredIssuesCount} / {issuesCount}
            </span>
          ) : (
            <span>{issuesCount}</span>
          )}
          <FilterMenu
            onSelectPriority={async (priority) => {
              await setPriorityFilterByParam([
                ...new Set([
                  ...((priorityFilters as Priority[]) || []),
                  priority,
                ]),
              ]);
            }}
            onSelectStatus={async (status) => {
              await setStatusFilterByParam([
                ...new Set([...((statusFilters as Status[]) || []), status]),
              ]);
            }}
          />
        </div>

        {/* right section */}
        <div className="flex items-center">
          {showSortOrderMenu && (
            <SortOrderMenu
              onSelect={(orderBy) => setOrderByParam(orderBy)}
              onCancelOrder={() => setOrderByParam(null)}
              order={orderBy}
            />
          )}
        </div>
      </div>
      {statusFilters || priorityFilters ? (
        <div className="flex  pl-2 pr-6 border-b border-gray-400 h-8 lg:pl-9">
          <FilterStatus
            filter={statusFilters}
            onDelete={() => setStatusFilterByParam(null)}
            label="Status"
          />
          <FilterStatus
            filter={priorityFilters}
            onDelete={() => setPriorityFilterByParam(null)}
            label="Priority"
          />
        </div>
      ) : null}
    </>
  );
};

export default TopFilter;
