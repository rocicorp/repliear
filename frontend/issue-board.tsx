import { groupBy } from "lodash";
import React from "react";
import { DragDropContext, DropResult } from "react-beautiful-dnd";

import { Status, Issue } from "./issue";
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
  // todo: implement this later
  //onUpdateIssue?: (id: string, changes: Partial<IssueValue>) => void;
}

export default function IssueBoard({ issues }: Props) {
  const issuesByType = getIssueByType(issues);

  const onDragEnd = ({ source, destination }: DropResult) => {
    if (!source || !destination) return;
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
