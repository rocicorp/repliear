import React, { useState } from "react";
import { DragDropContext, DropResult } from "react-beautiful-dnd";

import { getIssueByType, Status, getAllIssues } from "./issue";
import IssueCol from "./issue-col";
import type { Replicache, ScanOptionIndexedStartKey } from "replicache";
import { useSubscribe } from "replicache-react";
import type { M } from "./mutators";

interface Props {
  rep: Replicache<M>;
  // todo: implement this later
  //onUpdateIssue?: (id: string, changes: Partial<IssueValue>) => void;
}
//TODO(greg): fix this to use watch
//const ISSUES_WINDOW_SIZE = 200;

export default function IssueBoard({ rep }: Props) {
  const [startKey] = useState<undefined | ScanOptionIndexedStartKey>(undefined);
  const issuesWindow = useSubscribe(
    rep,
    (tx) => {
      return getAllIssues(tx);
    },
    [],
    [startKey]
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
