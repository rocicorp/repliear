import StatusIcon from "./status-icon";
import React, { CSSProperties, forwardRef, memo } from "react";
import {
  DraggableProvided,
  DraggableStateSnapshot,
  Droppable,
  DroppableProvided,
} from "react-beautiful-dnd";
import type { Issue, Status } from "./issue";
import IssueItem from "./issue-item";
import { FixedSizeList } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";
import PriorityMenu from "./priority-menu";
import classNames from "classnames";

interface Props {
  status: Status;
  title: string;
  issues: Array<Issue>;
}

interface RowProps {
  index: number;
  data: Array<Issue>;
  style: CSSProperties;
}

const IssueCloneItem = ({
  issue,
  provided,
  snapshot,
}: {
  issue: Issue;
  provided: DraggableProvided;
  snapshot: DraggableStateSnapshot;
}) => {
  const isDragging = snapshot.isDragging && !snapshot.isDropAnimating;
  return (
    <div
      style={{
        ...provided.draggableProps.style,
      }}
      ref={provided.innerRef}
      className={classNames(
        "cursor-default flex flex-col w-11/12 px-4 py-3 mb-2 text-white rounded focus:outline-none",
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
          <span className="text-xs font-normal uppercase">{issue.id}</span>
          <span className="mt-1 text-sm font-medium text-gray-2 line-clamp-2 overflow-ellipsis h-10">
            {issue.title}
          </span>
        </div>
      </div>
      <div className="mt-2.5 flex items-center">
        <PriorityMenu
          labelVisible={false}
          priority={issue.priority}
          onSelect={() => null}
        />
      </div>
    </div>
  );
};

const Row = ({ data: items, index, style }: RowProps) => (
  <div
    style={{
      ...style,
      top: `${parseFloat(style.top as string) + 10}px`,
    }}
  >
    <IssueItem issue={items[index]} index={index} key={index} />
  </div>
);

function IssueCol({ title, status, issues }: Props) {
  const statusIcon = <StatusIcon status={status} />;

  const innerElementType = forwardRef<
    HTMLDivElement,
    React.HTMLProps<HTMLDivElement>
  >(({ style, ...rest }, ref) => (
    <div
      ref={ref}
      style={{
        ...style,
        height: `${parseFloat((style?.height as string) || "0") + 100 * 2}px`,
      }}
      {...rest}
    />
  ));
  innerElementType.displayName = "innerElementType";

  return (
    <Droppable
      droppableId={status.toString()}
      key={status}
      type="category"
      renderClone={(provided, snapshot, rubric) => {
        const issue = issues[rubric.source.index];
        return (
          <IssueCloneItem
            issue={issue}
            provided={provided}
            snapshot={snapshot}
          />
        );
      }}
    >
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
            <div className="flex flex-col flex-1">
              <AutoSizer>
                {({ height, width }) => {
                  return (
                    <FixedSizeList
                      height={height}
                      itemCount={issues.length}
                      itemSize={120}
                      width={width}
                      outerRef={provided.innerRef}
                      innerElementType={innerElementType}
                      itemData={issues}
                    >
                      {Row}
                    </FixedSizeList>
                  );
                }}
              </AutoSizer>

              {provided.placeholder}
            </div>
          </div>
        );
      }}
    </Droppable>
  );
}

export default memo(IssueCol);
