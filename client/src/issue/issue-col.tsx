import StatusIcon from '../widgets/status-icon';
import React, {CSSProperties, memo, useMemo} from 'react';
import {
  Draggable,
  DraggableProvided,
  Droppable,
  DroppableProvided,
  DroppableStateSnapshot,
} from 'react-beautiful-dnd';
import IssueItem from './issue-item';
import {FixedSizeList} from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import {Issue, Priority, Status} from 'shared';
import {PersistentTreeView} from '@vlcn.io/materialite';

interface Props {
  status: Status;
  title: string;
  issues: PersistentTreeView<Issue>['value'];
  onChangePriority: (issue: Issue, priority: Priority) => void;
  onOpenDetail: (issue: Issue) => void;
}

interface RowProps {
  index: number;
  data: {
    issues: PersistentTreeView<Issue>['value'];
    onChangePriority: (issue: Issue, priority: Priority) => void;
    onOpenDetail: (issue: Issue) => void;
  };
  style: CSSProperties;
}

const RowPreMemo = ({data, index, style}: RowProps) => {
  const issue = data.issues.at(index);
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
              onOpenDetail={data.onOpenDetail}
            />
          </div>
        );
      }}
    </Draggable>
  );
};
const Row = memo(RowPreMemo);

function IssueCol({
  title,
  status,
  issues,
  onChangePriority,
  onOpenDetail,
}: Props) {
  const itemData = useMemo(
    () => ({
      issues,
      onChangePriority,
      onOpenDetail,
    }),
    [issues, onChangePriority, onOpenDetail],
  );
  const statusIcon = <StatusIcon className="flex-shrink-0" status={status} />;
  return (
    <div className="flex flex-col pr-3 flex-1 select-none min-w-[9rem]">
      {/* column title */}
      <div className="flex items-center pb-3 text-sm whitespace-nowrap overflow-hidden">
        {statusIcon}
        <div className="ml-3 mr-3 font-medium">{title}</div>
        <div className="mr-3 font-normal text-gray-400">
          {issues?.size || 0}
        </div>
      </div>

      {/* list of issues */}
      <div className="flex flex-col flex-1">
        <Droppable
          droppableId={status.toString()}
          key={status}
          type="category"
          mode="virtual"
          renderClone={(provided, _snapshot, rubric) => {
            const issue = issues.at(rubric.source.index);
            return (
              <div
                ref={provided.innerRef}
                {...provided.draggableProps}
                {...provided.dragHandleProps}
              >
                <IssueItem issue={issue} />
              </div>
            );
          }}
        >
          {(provided: DroppableProvided, snapshot: DroppableStateSnapshot) => {
            // Add an extra item to our list to make space for a dragging item
            // Usually the DroppableProvided.placeholder does this, but that won't
            // work in a virtual list
            const itemCount = snapshot.isUsingPlaceholder
              ? issues.size + 1
              : issues.size;
            return (
              <AutoSizer>
                {({height, width}: {width: number; height: number}) => {
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
