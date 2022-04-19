import StatusIcon from "./status-icon";
import React, { memo } from "react";
import { Droppable, DroppableProvided } from "react-beautiful-dnd";
import type { Issue, Status } from "./issue";
import IssueItem from "./issue-item";
import { FixedSizeList } from "react-window";

interface Props {
  status: Status;
  title: string;
  issues: Array<Issue>;
}

interface RowProps {
  index: number;
  data: Array<Issue>;
}

function IssueCol({ title, status, issues }: Props) {
  const statusIcon = <StatusIcon status={status} />;

  const Row = ({ data: items, index }: RowProps) => (
    <IssueItem issue={items[index]} index={index} key={index} />
  );

  return (
    <Droppable droppableId={status.toString()} key={status} type="category">
      {(provided: DroppableProvided) => {
        return (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="flex flex-col flex-shrink-0 pr-3 select-none w-1/5"
          >
            {/* column title */}
            <div className="flex items-center justify-between pb-3 text-sm">
              {/* left info */}
              <div className="flex items-center">
                {statusIcon}
                <span className="ml-3 mr-3 font-medium">{title} </span>
                <span className="mr-3 font-normal text-gray-400">
                  {issues?.length || 0}
                </span>
              </div>

              {/* action buttons */}
              <div className="flex items-center"></div>
            </div>

            {/* list of issues */}
            <div className="flex flex-col flex-1 w-full overflow-y-auto border-gray-400 pt-0.5 border-r-2">
              <FixedSizeList
                height={800}
                itemCount={issues.length}
                itemSize={80}
                width={"ltr"}
                outerRef={provided.innerRef}
                itemData={issues}
              >
                {Row}
              </FixedSizeList>
              {provided.placeholder}
            </div>
          </div>
        );
      }}
    </Droppable>
  );
}

export default memo(IssueCol);
