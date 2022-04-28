import StatusIcon from "./status-icon";
import React, { CSSProperties, forwardRef, memo } from "react";
import { Droppable, DroppableProvided } from "react-beautiful-dnd";
import type { Issue, Status } from "./issue";
import IssueItem from "./issue-item";
import { FixedSizeList } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";
import IssueItemBase from "./issue-item-base";

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
          <IssueItemBase
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
