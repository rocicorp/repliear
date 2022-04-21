import React, { useState } from "react";
import { DragDropContext, DropResult } from "react-beautiful-dnd";

import {
  getActiveIssues,
  getBacklogIssues,
  getIssueByType,
  Status,
  getIssues,
} from "./issue";
import IssueCol from "./issue-col";
import type { Replicache, ScanOptionIndexedStartKey } from "replicache";
import { useSubscribe } from "replicache-react";
import type { M } from "./mutators";

interface Props {
  rep: Replicache<M>;
  issueFilter: "all" | "active" | "backlog";
  // todo: implement this later
  //onUpdateIssue?: (id: string, changes: Partial<IssueValue>) => void;
}
const ISSUES_WINDOW_SIZE = 200;

export default function IssueBoard({ rep, issueFilter }: Props) {
  const [startKey] = useState<undefined | ScanOptionIndexedStartKey>(undefined);
  const issuesWindow = useSubscribe(
    rep,
    (tx) => {
      switch (issueFilter) {
        case "active":
          return getActiveIssues(tx, startKey, ISSUES_WINDOW_SIZE);
        case "backlog":
          return getBacklogIssues(tx, startKey, ISSUES_WINDOW_SIZE);
        default:
          return getIssues(tx, startKey, ISSUES_WINDOW_SIZE);
      }
    },
    [],
    [startKey, issueFilter]
  );

  const issuesByType = getIssueByType(issuesWindow);

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