import React from "react";
import type { Issue, Priority, Status } from "./issue";
import { formatDate } from "../util/date";
import PriorityMenu from "./priority-menu";
import StatusMenu from "./status-menu";
import { Flex, Text } from "@radix-ui/themes";
import { AvatarIcon } from "@radix-ui/react-icons";

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
    <Flex
      align="center"
      onClick={handleIssueRowClick}
      className="hover:bg-gray-900"
      style={{ height: 64 }}
    >
      <Flex justify="center" width="9" className="flex-shrink-0">
        <PriorityMenu
          onSelect={handleChangePriority}
          priority={issue.priority}
        />
      </Flex>
      <Flex justify="center" width="9" className="flex-shrink-0">
        <StatusMenu onSelect={handleChangeStatus} status={issue.status} />
      </Flex>
      <Flex
        direction="column"
        className="ml-4 flex-wrap flex-shrink-1 flex-grow cursor-pointer"
      >
        <Flex justify="between" align="center">
          <Text
            size="3"
            className="overflow-hidden line-clamp-1 overflow-ellipsis"
          >
            {issue.title.substring(0, 3000)}
          </Text>
          <Text size="1" className="flex-shrink-0 px-10">
            {formatDate(new Date(issue.modified), true)}
          </Text>
        </Flex>

        <Flex className="items-center mt-2">
          <AvatarIcon className="mr-2" />
          <Text size="1">{issue.creator}</Text>
        </Flex>
      </Flex>
    </Flex>
  );
}

export default React.memo(IssueRow);
