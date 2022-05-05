import StatusIcon from "./status-icon";
import React, { CSSProperties, memo, useMemo } from "react";
import {
  Draggable,
  DraggableProvided,
  Droppable,
  DroppableProvided,
  DroppableStateSnapshot,
} from "react-beautiful-dnd";
import type { Issue, Priority, Status } from "./issue";
import IssueItem from "./issue-item";
import { FixedSizeList } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";
import IssueItemBase from "./issue-item-base";

interface Props {
  status: Status;
  title: string;
  issues: Array<Issue>;
  onChangePriority: (issue: Issue, priority: Priority) => void;
}

interface RowProps {
  index: number;
  data: {
    issues: Array<Issue>;
    onChangePriority: (issue: Issue, priority: Priority) => void;
  };
  style: CSSProperties;
}

const RowPreMemo = ({ data, index, style }: RowProps) => {
  const issue = data.issues[index];
  // We are rendering an extra item for the placeholder.
  // To do this we increased our data set size to include one 'fake' item.
  if (!issue) {
    return null;
  }

  return (
    <Draggable draggableId={issue.id} index={index} key={issue.id}>
      {(provided: DraggableProvided) => {
        return (
          <div
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            style={{
              ...provided.draggableProps.style,
              ...style,
            }}
            ref={provided.innerRef}
          >
            <IssueItem
              issue={issue}
              key={index}
              onChangePriority={data.onChangePriority}
            />
          </div>
        );
      }}
    </Draggable>
  );
};
const Row = memo(RowPreMemo);

function IssueCol({ title, status, issues, onChangePriority }: Props) {
  const itemData = useMemo(
    () => ({
      issues,
      onChangePriority,
    }),
    [issues, onChangePriority]
  );
  const statusIcon = <StatusIcon status={status} />;
  return (
    <div className="flex flex-col flex-shrink-0 pr-3 select-none w-1/5">
      {/* column title */}
      <div className="flex items-center justify-between pb-3 text-sm">
        {/* left info */}
        <div className="flex items-center">
          {statusIcon}
          <span className="ml-3 mr-3 font-medium">{title} </span>
          <span className="mr-3 font-normal text-gray-410">
            {issues?.length || 0}
          </span>
        </div>

        {/* action buttons */}
        <div className="flex items-center"></div>
      </div>

      {/* list of issues */}
      <div className="flex flex-col flex-1">
        <Droppable
          droppableId={status.toString()}
          key={status}
          type="category"
          mode="virtual"
          renderClone={(provided, _snapshot, rubric) => {
            const issue = issues[rubric.source.index];
            return (
              <div
                ref={provided.innerRef}
                {...provided.draggableProps}
                {...provided.dragHandleProps}
              >
                <IssueItemBase issue={issue} />
              </div>
            );
          }}
        >
          {(provided: DroppableProvided, snapshot: DroppableStateSnapshot) => {
            // Add an extra item to our list to make space for a dragging item
            // Usually the DroppableProvided.placeholder does this, but that won't
            // work in a virtual list
            const itemCount = snapshot.isUsingPlaceholder
              ? issues.length + 1
              : issues.length;
            return (
              <AutoSizer>
                {({ height, width }) => {
                  return (
                    <FixedSizeList
                      height={height}
                      itemCount={itemCount}
                      itemSize={100}
                      width={width}
                      outerRef={provided.innerRef}
                      itemData={itemData}
                    >
                      {Row}
                    </FixedSizeList>
                  );
                }}
              </AutoSizer>
            );
          }}
        </Droppable>
      </div>
    </div>
  );
}

export default memo(IssueCol);
