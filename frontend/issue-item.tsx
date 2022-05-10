import React, { memo } from "react";
import type { Issue, Priority } from "./issue";
import { useQueryState } from "next-usequerystate";
import IssueItemBase from "./issue-item-base";

interface IssueProps {
  issue: Issue;
  onChangePriority: (issue: Issue, priority: Priority) => void;
}

const IssueItem = ({ issue, onChangePriority }: IssueProps) => {
  const [, setDetailIssueID] = useQueryState("iss", {
    history: "push",
  });

  const handleChangePriority = (p: Priority) => {
    if (onChangePriority) onChangePriority(issue, p);
  };

  const handleIssueItemClick = async () => {
    await setDetailIssueID(issue.id, {
      scroll: false,
      shallow: true,
    });
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
