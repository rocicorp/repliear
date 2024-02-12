import {
  Box,
  Button,
  Card,
  Flex,
  Heading,
  IconButton,
  ScrollArea,
  Section,
  Separator,
  Text,
  TextArea,
  TextField,
} from "@radix-ui/themes";
import classNames from "classnames";
import { Cross2Icon, Pencil1Icon } from "@radix-ui/react-icons";
import { ClockIcon, AvatarIcon, CheckIcon } from "@radix-ui/react-icons";
import { Remark } from "react-remark";
import StatusMenu from "./status-menu";
import PriorityMenu from "./priority-menu";
import { formatDate, timeAgo } from "util/date";
import { useCallback, useState } from "react";
import {
  Issue,
  IssueUpdate,
  Priority,
  Status,
  getIssueComments,
  getIssueDescription,
} from "./issue";
import { useSubscribe } from "replicache-react";
import type { Replicache } from "replicache";
import type { M } from "./mutators";
import { sortBy } from "lodash";
import { nanoid } from "nanoid";

interface Props {
  issueId: string | null;
  onCloseDetail: VoidFunction;
  onUpdateIssues: (issueUpdates: IssueUpdate[]) => void;
  issues: Issue[];
  rep: Replicache<M>;
  onCreateComment: (comment: Comment) => Promise<void>;
}

export const IssueDetailSideView: React.FC<Props> = ({
  issueId,
  onCloseDetail,
  issues,
  rep,
  onUpdateIssues,
  onCreateComment,
}) => {
  const issue = issues.find((issue) => issue.id === issueId);

  const [inEditMode, setEditMode] = useState(false);
  const [titleText, setTitleText] = useState("");
  const [descriptionText, setDescriptionText] = useState("");
  const [commentText, setCommentText] = useState("");

  const description = useSubscribe(
    rep,
    async (tx) => {
      if (issueId) {
        return (await getIssueDescription(tx, issueId)) || null;
      }
      return null;
    },
    { default: null, dependencies: [issueId] }
  );

  const comments = useSubscribe(
    rep,
    async (tx) => {
      if (issueId) {
        return (await getIssueComments(tx, issueId)) || [];
      }
      return [];
    },
    { default: [], dependencies: [issueId] }
  );

  const onEdit = () => {
    setTitleText(issue?.title || "");
    setDescriptionText(description || "");
    setEditMode(true);
  };

  const onSave = () => {
    if (issue) {
      const descriptionUpdate =
        descriptionText !== description
          ? {
              description: description || "",
              descriptionChange: descriptionText,
            }
          : undefined;

      onUpdateIssues([
        {
          issue,
          issueChanges:
            titleText !== issue.title
              ? {
                  title: titleText,
                }
              : {},
          descriptionUpdate,
        },
      ]);
    }
    setEditMode(false);
  };

  const onChangeStatus = useCallback(
    (status: Status) => {
      issue && onUpdateIssues([{ issue, issueChanges: { status } }]);
    },
    [onUpdateIssues, issue]
  );

  const onChangePriority = useCallback(
    (priority: Priority) => {
      issue && onUpdateIssues([{ issue, issueChanges: { priority } }]);
    },
    [onUpdateIssues, issue]
  );

  const onClose = () => {
    onCloseDetail();
    setEditMode(false);
  };

  const onComment = useCallback(() => {
    if (commentText !== "") {
      onCreateComment({
        id: nanoid(),
        issueID: issue?.id as string,
        created: Date.now(),
        creator: "Me",
        body: commentText,
      });
      setCommentText("");
    }
  }, [onCreateComment, commentText, issue]);

  return (
    <div
      className={classNames(
        "bg-gray-900 top-0 bottom-0 right-0 transition-width max-w-xl z-10",
        {
          "w-1/3": issueId,
          "w-0": !issueId,
        }
      )}
    >
      {!!issue && (
        <ScrollArea scrollbars="vertical">
          <Box className="p-8">
            <Flex height="9" justify="between">
              {inEditMode ? (
                <Flex>
                  <IconButton color="gray">
                    <CheckIcon
                      onClick={onSave}
                      className="w-5 h-5 cursor-pointer"
                    />
                  </IconButton>
                  <IconButton className="ml-2" color="gray">
                    <Cross2Icon
                      onClick={() => setEditMode(false)}
                      className="w-5 h-5 cursor-pointer"
                    />
                  </IconButton>
                </Flex>
              ) : (
                <IconButton color="gray">
                  <Pencil1Icon
                    onClick={onEdit}
                    className="w-5 h-5 cursor-pointer"
                  />
                </IconButton>
              )}

              <IconButton color="gray">
                <Cross2Icon
                  onClick={onClose}
                  className="w-5 h-5 cursor-pointer"
                />
              </IconButton>
            </Flex>
            <Flex align="center" gap="3" width="100%">
              <StatusMenu
                onSelect={onChangeStatus}
                status={issue?.status || Status.BACKLOG}
              />
              {inEditMode ? (
                <TextField.Root className="w-full">
                  <TextField.Input
                    value={titleText}
                    onChange={(e) => setTitleText(e.target.value)}
                  />
                </TextField.Root>
              ) : (
                <Heading size="4">{issue?.title}</Heading>
              )}
            </Flex>
            <Section size="1">
              <ScrollArea
                {...(inEditMode ? {} : { className: "pl-2 pr-6" })}
                type="auto"
                scrollbars="both"
                style={{
                  maxHeight: 500,
                  width: "100%",
                  maxWidth: 500,
                  height: "100%",
                }}
              >
                {inEditMode ? (
                  <TextArea
                    style={{ height: 500 }}
                    onChange={(e) => setDescriptionText(e.target.value)}
                    value={descriptionText}
                  />
                ) : (
                  <Text size="2">
                    <Remark>{description ?? ""}</Remark>
                  </Text>
                )}
              </ScrollArea>
            </Section>
            <Flex height="8" align="center">
              <Box className="ml-0.5">
                <AvatarIcon />
              </Box>
              <Box className="ml-4.5">{issue?.creator}</Box>
            </Flex>
            <Flex height="8" align="center">
              <Box className="ml-0.5">
                <ClockIcon />
              </Box>
              <Box className="ml-4.5">
                {formatDate(new Date(issue?.modified), true)}
              </Box>
            </Flex>
            <PriorityMenu
              onSelect={onChangePriority}
              priority={issue?.priority}
              labelVisible
            />
            <StatusMenu
              onSelect={onChangeStatus}
              status={issue?.status}
              labelVisible
            />
            <Separator size="4" my="3" />
            {!!comments.length && (
              <>
                <Heading size="3">Comments</Heading>
                {sortBy(comments, (comment) => comment.created).map(
                  (comment) => (
                    <Card className="my-4">
                      <Flex align="center" gap="2">
                        <AvatarIcon className="w-5 h-5" />
                        <Text as="div" size="1">
                          <Text weight="bold">{comment.creator} </Text>
                          {timeAgo(comment.created)}
                        </Text>
                      </Flex>
                      <Text as="p" size="1" className="my-2 p-3 break-all">
                        <Remark>{comment.body}</Remark>
                      </Text>
                    </Card>
                  )
                )}
              </>
            )}
            <TextArea
              placeholder="Leave a comment ..."
              onChange={(e) => setCommentText(e.target.value)}
              value={commentText}
            ></TextArea>
            <Button className="my-4" onClick={onComment}>
              Comment
            </Button>
          </Box>
        </ScrollArea>
      )}
    </div>
  );
};
