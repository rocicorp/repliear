import React from "react";
import type { Issue, Priority, Status } from "./issue";
import { formatDate } from "../util/date";
import PriorityMenu from "./priority-menu";
import StatusMenu from "./status-menu";
import { Flex, Box, Text } from "@radix-ui/themes";

interface Props {
  issue: Issue;
  onChangePriority: (issue: Issue, priority: Priority) => void;
  onChangeStatus: (issue: Issue, status: Status) => void;
  onOpenDetail: (issue: Issue) => void;
}

function IssueRow({
  issue,
  onChangePriority,
  onChangeStatus,
  onOpenDetail,
}: Props) {
  const handleChangePriority = (p: Priority) => onChangePriority(issue, p);
  const handleChangeStatus = (status: Status) => onChangeStatus(issue, status);
  const handleIssueRowClick = () => onOpenDetail(issue);

  return (
    <Flex align="center" onClick={handleIssueRowClick}>
      <Box width="9" height="9" className="flex-shrink-0">
        <PriorityMenu
          onSelect={handleChangePriority}
          priority={issue.priority}
        />
      </Box>
      <Box width="9" height="9" className="flex-shrink-0">
        <StatusMenu onSelect={handleChangeStatus} status={issue.status} />
      </Box>
      <Text
        as="div"
        className="flex-wrap flex-shrink-1 flex-grow overflow-hidden line-clamp-1 overflow-ellipsis"
      >
        {issue.title.substring(0, 3000)}
      </Text>
      <Box className="flex-shrink-0 px-10">
        {formatDate(new Date(issue.modified))}
      </Box>
    </Flex>
  );
}

export default React.memo(IssueRow);
