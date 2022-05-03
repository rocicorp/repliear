import type { Issue, Priority } from "./issue";
import type {
  DraggableProvided,
  DraggableStateSnapshot,
} from "react-beautiful-dnd";
import React from "react";
import classNames from "classnames";
import PriorityMenu from "./priority-menu";

interface IssueItemBaseProps {
  issue: Issue;
  provided: DraggableProvided;
  snapshot: DraggableStateSnapshot;
  handleIssueItemClick?: () => void;
  handleChangePriority?: (priority: Priority) => void;
}

const IssueItemBase = ({
  issue,
  provided,
  snapshot,
  handleIssueItemClick = () => null,
  handleChangePriority = () => null,
}: IssueItemBaseProps) => {
  const isDragging = snapshot.isDragging && !snapshot.isDropAnimating;

  return (
    <div
      style={{
        ...provided.draggableProps.style,
      }}
      ref={provided.innerRef}
      className={classNames(
        "cursor-default flex flex-col w-11/12 px-4 py-2 mb-2 text-white rounded focus:outline-none",
        {
          /* eslint-disable @typescript-eslint/naming-convention */
          "shadow-modal": isDragging,
          "bg-gray-300": isDragging,
          "bg-gray-400": !isDragging,
          /* eslint-enable @typescript-eslint/naming-convention */
        }
      )}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
    >
      <div
        className="flex justify-between w-full cursor-pointer overflow-x-clip"
        onClick={handleIssueItemClick}
      >
        <div className="flex flex-col">
          <span className="text-xs font-normal uppercase"></span>
          <span className="mt-1 text-sm font-medium text-gray-2 line-clamp-2 overflow-ellipsis h-10">
            {issue.title}
          </span>
        </div>
      </div>
      <div className="mt-2.5 flex items-center">
        <PriorityMenu
          onSelect={handleChangePriority}
          labelVisible={false}
          priority={issue.priority}
        />
      </div>
    </div>
  );
};

export default IssueItemBase;
