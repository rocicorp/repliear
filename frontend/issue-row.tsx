import React from "react";
import type { Issue, Priority, Status } from "./issue";
import { formatDate } from "../util/date";
import PriorityMenu from "./priority-menu";
import StatusMenu from "./status-menu";

interface Props {
  issue: Issue;
  onChangePriority?: (issue: Issue, priority: Priority) => void;
  onChangeStatus?: (issue: Issue, status: Status) => void;
}

export default function IssueRow({
  issue,
  onChangePriority,
  onChangeStatus,
}: Props) {
  const handleChangePriority = (p: Priority) => {
    if (onChangePriority) onChangePriority(issue, p);
  };

  const handleChangeStatus = (status: Status) => {
    if (onChangeStatus) onChangeStatus(issue, status);
  };
  return (
    <div
      key={issue.id}
      className="inline-flex items-center flex-grow flex-shrink w-full min-w-0 pl-2 pr-8 text-sm border-b border-gray-100 hover:bg-gray-100 h-11"
      id={issue.id}
    >
      <div className="flex-shrink-0 hidden ml-2 sm:block">
        <input
          type="checkbox"
          className="rounded-sm appearance-none form-checkbox focus:ring-transparent focus:outline-none form-stick checked:bg-indigo-600 checked:border-transparent border border-gray-300 md:border-transparent hover:border-gray-600 w-3.5 h-3.5"
        />
      </div>
      <div className="flex-shrink-0 ml-2">
        <PriorityMenu
          labelVisible={false}
          onSelect={handleChangePriority}
          defaultPriority={issue.priority}
        />
      </div>
      <div className="flex-shrink-0 hidden ml-2 font-normal text-gray-500 sm:block w-11 md:block"></div>
      <div className="flex-shrink-0 ml-2">
        <StatusMenu
          onSelect={handleChangeStatus}
          defaultStatus={issue.status}
        />
      </div>
      <div className="flex-wrap flex-shrink ml-2 overflow-hidden font-medium line-clamp-1 overflow-ellipsis">
        {issue.title.substr(0, 3000) || ""}
      </div>
      <div className="flex flex-grow ml-2"></div>
      <div className="flex-shrink-0 hidden w-11 ml-2 mr-3 font-normal sm:block">
        {formatDate(new Date(issue.modified))}
      </div>
    </div>
  );
}
