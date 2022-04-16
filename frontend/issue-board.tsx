import React from "react";
import { DragDropContext, DropResult } from "react-beautiful-dnd";

import { getIssueByType, Issue, IssueValue, Status } from "./issue";
import IssueCol from "./issue-col";

interface Props {
  issues: Issue[];
  onUpdateIssue?: (id: string, changes: Partial<IssueValue>) => void;
}

export default function IssueBoard({ issues }: Props) {
  const issuesByType = getIssueByType(issues);

  const onDragEnd = ({ source, destination }: DropResult) => {
    if (!source || !destination) return;
    //onUpdateIssue(source.droppableId, { status: destination.index });
  };

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
