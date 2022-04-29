import { generateNKeysBetween } from "fractional-indexing";
import { groupBy, indexOf } from "lodash";
import React, { useCallback } from "react";
import { DragDropContext, DropResult } from "react-beautiful-dnd";

import { Status, Issue, IssueValue, Description, IssueUpdate } from "./issue";
import IssueCol from "./issue-col";

export type IssuesByStatusType = {
  [Status.BACKLOG]: Issue[];
  [Status.TODO]: Issue[];
  [Status.IN_PROGRESS]: Issue[];
  [Status.DONE]: Issue[];
  [Status.CANCELED]: Issue[];
};

export const getIssueByType = (allIssues: Issue[]): IssuesByStatusType => {
  const issuesBySType = groupBy(allIssues, "status");
  const defaultIssueByType = {
    [Status.BACKLOG]: [],
    [Status.TODO]: [],
    [Status.IN_PROGRESS]: [],
    [Status.DONE]: [],
    [Status.CANCELED]: [],
  };
  const result = { ...defaultIssueByType, ...issuesBySType };
  return result;
};

interface Props {
  issues: Issue[];
  onUpdateIssues: (issueUpdates: IssueUpdate[]) => void;
}

export function getKanbanOrderIssueUpdates(
  issueToMove: Issue,
  issueToInsertBefore: Issue,
  issues: Issue[]
): IssueUpdate[] {
  const indexInKanbanOrder = indexOf(issues, issueToInsertBefore);
  let beforeKey: string | null = null;
  if (indexInKanbanOrder > 0) {
    beforeKey = issues[indexInKanbanOrder - 1].kanbanOrder;
  }
  let afterKey: string | null = null;
  const issueIDsToRekey: string[] = [];
  // If the issues we are trying to move between
  // have identical kanbanOrder values, we need to fix up the
  // collision by re-keying the issues.
  for (let i = indexInKanbanOrder; i < issues.length; i++) {
    if (issues[i].kanbanOrder !== beforeKey) {
      afterKey = issues[i].kanbanOrder;
      break;
    }
    issueIDsToRekey.push(issues[i].id);
  }
  const newKanbanOrderKeys = generateNKeysBetween(
    beforeKey,
    afterKey,
    issueIDsToRekey.length + 1 // +1 for the dragged issue
  );

  const issueUpdates = [
    {
      id: issueToMove.id,
      changes: { kanbanOrder: newKanbanOrderKeys[0] },
    },
  ];
  for (let i = 0; i < issueIDsToRekey.length; i++) {
    issueUpdates.push({
      id: issueIDsToRekey[i],
      changes: { kanbanOrder: newKanbanOrderKeys[i + 1] },
    });
  }
  return issueUpdates;
}

export default function IssueBoard({ issues, onUpdateIssues }: Props) {
  const issuesByType = getIssueByType(issues);

  const onDragEnd = useCallback(
    ({ source, destination }: DropResult) => {
      if (!destination) {
        return;
      }
      const sourceStatus = source?.droppableId as Status;
      const draggedIssue = issuesByType[sourceStatus][source.index];
      if (!draggedIssue) {
        return;
      }
      const newStatus = destination.droppableId as Status;
      const newIndex = destination?.index;
      const issueToInsertBefore = issuesByType[newStatus][newIndex];
      if (draggedIssue === issueToInsertBefore) {
        return;
      }
      const issueUpdates = issueToInsertBefore
        ? getKanbanOrderIssueUpdates(draggedIssue, issueToInsertBefore, issues)
        : [{ id: draggedIssue.id, changes: {} }];
      if (newStatus !== sourceStatus) {
        issueUpdates[0].changes.status = newStatus;
      }
      onUpdateIssues(issueUpdates);
    },
    [issues, issuesByType, onUpdateIssues]
  );

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex flex-1 pt-6 pl-8 overflow-scroll-x bg-gray-500 border-color-gray-2 border-right-width-1">
        <IssueCol
          title={"Backlog"}
          status={Status.BACKLOG}
          issues={issuesByType[Status.BACKLOG]}
        />
        <IssueCol
          title={"Todo"}
          status={Status.TODO}
          issues={issuesByType[Status.TODO]}
        />
        <IssueCol
          title={"In Progress"}
          status={Status.IN_PROGRESS}
          issues={issuesByType[Status.IN_PROGRESS]}
        />
        <IssueCol
          title={"Done"}
          status={Status.DONE}
          issues={issuesByType[Status.DONE]}
        />
        <IssueCol
          title={"Canceled"}
          status={Status.CANCELED}
          issues={issuesByType[Status.CANCELED]}
        />
      </div>
    </DragDropContext>
  );
}
