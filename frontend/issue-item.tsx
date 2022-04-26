import classNames from "classnames";
import PriorityMenu from "./priority-menu";
import React, { memo } from "react";
import {
  Draggable,
  DraggableProvided,
  DraggableStateSnapshot,
} from "react-beautiful-dnd";
import type { Issue, Priority } from "./issue";

interface IssueProps {
  issue: Issue;
  index: number;
  onChangePriority?: (issue: Issue, priority: Priority) => void;
}

const IssueItem = ({ issue, index, onChangePriority }: IssueProps) => {
  const handleChangePriority = (p: Priority) => {
    if (onChangePriority) onChangePriority(issue, p);
  };

  return (
    <Draggable draggableId={issue.id || "id"} index={index} key={issue.id}>
      {(provided: DraggableProvided, snapshot: DraggableStateSnapshot) => {
        const isDragging = snapshot.isDragging && !snapshot.isDropAnimating;
        console.log("isDragging", isDragging);
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
            <div className="flex justify-between w-full cursor-default">
              <div className="flex flex-col">
                <span className="text-xs font-normal uppercase">
                  {issue.id}
                </span>
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
      }}
    </Draggable>
  );
};

export default memo(IssueItem);
