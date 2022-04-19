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
        return (
          <div
            ref={provided.innerRef}
            className={classNames(
              "cursor-default flex flex-col w-full px-4 py-3 mb-2 bg-white rounded focus:outline-none",
              {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                "shadow-modal": isDragging,
              }
            )}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
          >
            <div className="flex justify-between w-full cursor-default">
              <div className="flex flex-col">
                <span className="text-xs font-normal text-gray-500 uppercase">
                  {issue.id}
                </span>
                <span className="mt-1 text-sm font-medium text-gray-700 line-clamp-2 overflow-ellipsis">
                  {issue.title}
                </span>
              </div>
            </div>
            <div className="mt-2.5 flex items-center">
              <PriorityMenu
                onSelect={handleChangePriority}
                labelVisible={true}
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
