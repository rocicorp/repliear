/* eslint-disable @typescript-eslint/naming-convention */
import {DifferenceStream, PersistentTreeView} from '@vlcn.io/materialite';
import {useQuery} from '@vlcn.io/materialite-react';
import {generateNKeysBetween} from 'fractional-indexing';
import {memo, useCallback} from 'react';
import {DragDropContext, DropResult} from 'react-beautiful-dnd';
import {Issue, IssueUpdate, Priority, Status} from 'shared';
import IssueCol from './issue-col';
import {db} from '../materialite/db';
import {useFilters} from '../hooks/query-state-hooks';

export function getKanbanOrderIssueUpdates(
  issueToMove: Issue,
  issueToInsertBefore: Issue,
  issues: PersistentTreeView<Issue>['value'],
): IssueUpdate[] {
  const indexInKanbanOrder = issues.findIndex(issueToInsertBefore);
  let beforeKey: string | null = null;
  if (indexInKanbanOrder > 0) {
    beforeKey = issues.at(indexInKanbanOrder - 1).kanbanOrder;
  }
  let afterKey: string | null = null;
  const issuesToReKey: Issue[] = [];
  // If the issues we are trying to move between
  // have identical kanbanOrder values, we need to fix up the
  // collision by re-keying the issues.
  for (let i = indexInKanbanOrder; i < issues.size; i++) {
    if (issues.at(i).kanbanOrder !== beforeKey) {
      afterKey = issues.at(i).kanbanOrder;
      break;
    }
    issuesToReKey.push(issues.at(i));
  }
  const newKanbanOrderKeys = generateNKeysBetween(
    beforeKey,
    afterKey,
    issuesToReKey.length + 1, // +1 for the dragged issue
  );

  const issueUpdates = [
    {
      issue: issueToMove,
      issueChanges: {kanbanOrder: newKanbanOrderKeys[0]},
    },
  ];
  for (let i = 0; i < issuesToReKey.length; i++) {
    issueUpdates.push({
      issue: issuesToReKey[i],
      issueChanges: {kanbanOrder: newKanbanOrderKeys[i + 1]},
    });
  }
  return issueUpdates;
}

interface Props {
  onUpdateIssues: (issueUpdates: IssueUpdate[]) => void;
  onOpenDetail: (issue: Issue) => void;
}

function applyFilters<T>(
  stream: DifferenceStream<T>,
  filters: ((x: T) => boolean)[],
): DifferenceStream<T> {
  for (const filter of filters) {
    stream = stream.filter(filter);
  }

  return stream;
}

function IssueBoard({onUpdateIssues, onOpenDetail}: Props) {
  const start = performance.now();
  const {filters} = useFilters();
  const issuesByType = {
    BACKLOG: useQuery(() => {
      const source = db.issues.getSortedSource('KANBAN');
      return applyFilters(
        source.stream.filter(issue => issue.status === 'BACKLOG'),
        filters,
      ).materialize(source.comparator);
    }, [filters])[1],
    TODO: useQuery(() => {
      const source = db.issues.getSortedSource('KANBAN');
      return applyFilters(
        source.stream.filter(issue => issue.status === 'TODO'),
        filters,
      ).materialize(source.comparator);
    }, [filters])[1],
    IN_PROGRESS: useQuery(() => {
      const source = db.issues.getSortedSource('KANBAN');
      return applyFilters(
        source.stream.filter(issue => issue.status === 'IN_PROGRESS'),
        filters,
      ).materialize(source.comparator);
    }, [filters])[1],
    DONE: useQuery(() => {
      const source = db.issues.getSortedSource('KANBAN');
      return applyFilters(
        source.stream.filter(issue => issue.status === 'DONE'),
        filters,
      ).materialize(source.comparator);
    }, [filters])[1],
    CANCELED: useQuery(() => {
      const source = db.issues.getSortedSource('KANBAN');
      return applyFilters(
        source.stream.filter(issue => issue.status === 'CANCELED'),
        filters,
      ).materialize(source.comparator);
    }, [filters])[1],
  };
  console.log(`Issues by type duration: ${performance.now() - start}ms`);

  const handleDragEnd = ({source, destination}: DropResult) => {
    if (!destination) {
      return;
    }
    const sourceStatus = source?.droppableId as Status;
    const draggedIssue = issuesByType[sourceStatus].at(source.index);
    if (!draggedIssue) {
      return;
    }
    const newStatus = destination.droppableId as Status;
    const newIndex =
      sourceStatus === newStatus && source.index < destination.index
        ? destination.index + 1
        : destination.index;
    const issueToInsertBefore = issuesByType[newStatus].at(newIndex);
    if (draggedIssue === issueToInsertBefore) {
      return;
    }
    const issueUpdates = issueToInsertBefore
      ? getKanbanOrderIssueUpdates(
          draggedIssue,
          issueToInsertBefore,
          issuesByType[newStatus],
        )
      : [{issue: draggedIssue, issueChanges: {}}];
    if (newStatus !== sourceStatus) {
      issueUpdates[0] = {
        ...issueUpdates[0],
        issueChanges: {
          ...issueUpdates[0].issueChanges,
          status: newStatus,
        },
      };
    }
    onUpdateIssues(issueUpdates);
  };

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

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex flex-1 pt-6 pl-8 overflow-scroll-x bg-gray border-color-gray-50 border-right-width-1">
        <IssueCol
          title={'Backlog'}
          status="BACKLOG"
          issues={issuesByType.BACKLOG}
          onChangePriority={handleChangePriority}
          onOpenDetail={onOpenDetail}
        />
        <IssueCol
          title={'Todo'}
          status="TODO"
          issues={issuesByType.TODO}
          onChangePriority={handleChangePriority}
          onOpenDetail={onOpenDetail}
        />
        <IssueCol
          title={'In Progress'}
          status="IN_PROGRESS"
          issues={issuesByType.IN_PROGRESS}
          onChangePriority={handleChangePriority}
          onOpenDetail={onOpenDetail}
        />
        <IssueCol
          title={'Done'}
          status="DONE"
          issues={issuesByType.DONE}
          onChangePriority={handleChangePriority}
          onOpenDetail={onOpenDetail}
        />
        <IssueCol
          title={'Canceled'}
          status={'CANCELED'}
          issues={issuesByType.CANCELED}
          onChangePriority={handleChangePriority}
          onOpenDetail={onOpenDetail}
        />
      </div>
    </DragDropContext>
  );
}

export default memo(IssueBoard);
