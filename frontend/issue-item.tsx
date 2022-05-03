import React, { memo } from "react";
import {
  Draggable,
  DraggableProvided,
  DraggableStateSnapshot,
} from "react-beautiful-dnd";
import type { Issue, Priority } from "./issue";
import { queryTypes, useQueryStates } from "next-usequerystate";
import IssueItemBase from "./issue-item-base";

interface IssueProps {
  issue: Issue;
  index: number;
  onChangePriority?: (issue: Issue, priority: Priority) => void;
}

const IssueItem = ({ issue, index, onChangePriority }: IssueProps) => {
  const [, setDetailView] = useQueryStates(
    {
      view: queryTypes.string,
      iss: queryTypes.string,
    },
    { history: "push" }
  );

  const handleChangePriority = (p: Priority) => {
    if (onChangePriority) onChangePriority(issue, p);
  };

  const handleIssueItemClick = async () => {
    await setDetailView(
      { view: "detail", iss: issue.id },
      {
        scroll: false,
        shallow: true,
      }
    );
  };

  return (
    <Draggable draggableId={issue.id || "id"} index={index} key={issue.id}>
      {(provided: DraggableProvided, snapshot: DraggableStateSnapshot) => {
        return (
          <IssueItemBase
            issue={issue}
            provided={provided}
            snapshot={snapshot}
            handleIssueItemClick={handleIssueItemClick}
            handleChangePriority={handleChangePriority}
          />
        );
      }}
    </Draggable>
  );
};

export default memo(IssueItem);
