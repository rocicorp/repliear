import React, {
  CSSProperties,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import IssueRow from './issue-row';
import AutoSizer from 'react-virtualized-auto-sizer';
import {FixedSizeList} from 'react-window';
import {Issue, IssueUpdate, Priority, Status} from 'shared';
import {PersistentTreeView} from '@vlcn.io/materialite';

interface Props {
  onUpdateIssues: (issueUpdates: IssueUpdate[]) => void;
  onOpenDetail: (issue: Issue) => void;
  issues: PersistentTreeView<Issue>['value'];
  view: string | null;
}

type ListData = {
  issues: PersistentTreeView<Issue>['value'];
  handleChangePriority: (issue: Issue, priority: Priority) => void;
  handleChangeStatus: (issue: Issue, status: Status) => void;
  onOpenDetail: (issue: Issue) => void;
};

const itemKey = (index: number, data: ListData) => data.issues.at(index).id;

const RawRow = ({
  data,
  index,
  style,
}: {
  data: ListData;
  index: number;
  style: CSSProperties;
}) => (
  <div style={style}>
    <IssueRow
      issue={data.issues.at(index)}
      onChangePriority={data.handleChangePriority}
      onChangeStatus={data.handleChangeStatus}
      onOpenDetail={data.onOpenDetail}
    />
  </div>
);

const Row = memo(RawRow);

const IssueList = ({onUpdateIssues, onOpenDetail, issues, view}: Props) => {
  const fixedSizeListRef = useRef<FixedSizeList>(null);
  useEffect(() => {
    fixedSizeListRef.current?.scrollTo(0);
  }, [view]);

  const handleChangePriority = useCallback(
    (issue: Issue, priority: Priority) => {
      onUpdateIssues([
        {
          issue,
          issueChanges: {priority},
        },
      ]);
    },
    [onUpdateIssues],
  );

  const handleChangeStatus = useCallback(
    (issue: Issue, status: Status) => {
      onUpdateIssues([
        {
          issue,
          issueChanges: {status},
        },
      ]);
    },
    [onUpdateIssues],
  );

  const itemData = useMemo(
    () => ({issues, handleChangePriority, handleChangeStatus, onOpenDetail}),
    [issues, handleChangePriority, handleChangeStatus, onOpenDetail],
  );

  return (
    <div className="flex flex-col flex-grow overflow-auto">
      <AutoSizer>
        {({height, width}: {width: number; height: number}) => (
          <FixedSizeList
            ref={fixedSizeListRef}
            height={height}
            itemCount={issues.size}
            itemSize={43}
            itemData={itemData}
            itemKey={itemKey}
            overscanCount={10}
            width={width}
          >
            {Row}
          </FixedSizeList>
        )}
      </AutoSizer>
    </div>
  );
};

export default memo(IssueList);
