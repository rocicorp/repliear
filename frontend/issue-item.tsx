import React, { memo } from "react";
import type { Issue, Priority } from "./issue";
import { queryTypes, useQueryStates } from "next-usequerystate";
import IssueItemBase from "./issue-item-base";

interface IssueProps {
  issue: Issue;
  onChangePriority: (issue: Issue, priority: Priority) => void;
}

const IssueItem = ({ issue, onChangePriority }: IssueProps) => {
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
    <IssueItemBase
      issue={issue}
      handleIssueItemClick={handleIssueItemClick}
      handleChangePriority={handleChangePriority}
    />
  );
};

export default memo(IssueItem);
