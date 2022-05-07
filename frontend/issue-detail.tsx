import React, { useCallback, useEffect, useState } from "react";
import CloseIcon from "./assets/icons/close.svg";
import ArrowIcon from "./assets/icons/arrow.svg";

import DefaultAvatarIcon from "./assets/icons/avatar.svg";
import EditIcon from "@mui/icons-material/Edit";
import PriorityMenu from "./priority-menu";
import {
  Comment,
  getIssueComments,
  Description,
  getIssueDescription,
  Issue,
  Priority,
  Status,
  getIssue,
  IssueUpdate,
} from "./issue";
import StatusMenu from "./status-menu";
import { queryTypes, useQueryStates } from "next-usequerystate";

import type { Replicache } from "replicache";
import type { M } from "./mutators";
import { useSubscribe } from "replicache-react";
import { Remark } from "react-remark";
import { nanoid } from "nanoid";
import { timeAgo } from "../util/date";
import { useKeyPressed } from "./hooks/useKeyPressed";

interface Props {
  onUpdateIssues: (issueUpdates: IssueUpdate[]) => void;
  onAddComment: (comment: Comment) => void;
  issues: Issue[];
  rep: Replicache<M>;
}

const commentsList = (comments: Comment[]) => {
  return comments.map((comment) => (
    <div
      key={comment.id}
      className=" max-w-[85vw] mx-3 bg-gray-400 mt-0 mb-5 border-transparent rounded py-3 px-3 relative whitespace-pre-wrap overflow-auto"
    >
      <div className="h-6 mb-1 -mt-px relative">
        <DefaultAvatarIcon className="w-4.5 h-4.5 rounded-full overflow-hidden flex-shrink-0 float-left mr-2" />
        {comment.creator} {timeAgo(comment.created)}
      </div>
      <div className="block flex-1 whitespace-pre-wrap">
        <Remark>{comment.body}</Remark>
      </div>
    </div>
  ));
};

const handleClickCloseBtn = async () => {
  history.back();
};

export default function IssueDetail({
  rep,
  onUpdateIssues,
  onAddComment,
  issues,
}: Props) {
  const [detailView, setDetailView] = useQueryStates({
    view: queryTypes.string,
    iss: queryTypes.string,
  });

  const [editMode, setEditMode] = useState(false);

  const [currentIssueIdx, setCurrentIssueIdx] = useState<number>(-1);

  const [commentText, setCommentText] = useState("");
  const [titleText, setTitle] = useState("");
  const [descriptionText, setDescription] = useState("");

  const { iss } = detailView;

  useEffect(() => {
    if (detailView.iss) {
      const index = issues.findIndex((issue) => issue.id === detailView.iss);
      setCurrentIssueIdx(index);
    }
  }, [issues, detailView.iss]);

  const issue = useSubscribe<Issue | null>(
    rep,
    async (tx) => {
      if (iss) {
        return (await getIssue(tx, iss)) || null;
      }
      return null;
    },
    null,
    [iss]
  );
  const description = useSubscribe<Description>(
    rep,
    async (tx) => {
      if (iss) {
        return (await getIssueDescription(tx, iss)) || "";
      }
      return "";
    },
    "",
    [iss]
  );

  const comments = useSubscribe<Comment[] | []>(
    rep,
    async (tx) => {
      if (iss) {
        return (await getIssueComments(tx, iss)) || [];
      }
      return [];
    },
    [],
    [iss]
  );

  const handleChangePriority = useCallback(
    (priority: Priority) => {
      issue && onUpdateIssues([{ id: issue.id, changes: { priority } }]);
    },
    [onUpdateIssues, issue]
  );

  const handleChangeStatus = useCallback(
    (status: Status) => {
      issue && onUpdateIssues([{ id: issue.id, changes: { status } }]);
    },
    [onUpdateIssues, issue]
  );

  const handleChangeDescription = useCallback(
    (description: string) => {
      issue && onUpdateIssues([{ id: issue.id, changes: {}, description }]);
    },
    [onUpdateIssues, issue]
  );

  const handleChangeTitle = useCallback(
    (title: string) => {
      issue && onUpdateIssues([{ id: issue.id, changes: { title } }]);
    },
    [onUpdateIssues, issue]
  );

  const handleAddComment = useCallback(() => {
    if (commentText !== "") {
      onAddComment({
        id: nanoid(),
        issueID: issue?.id as string,
        created: Date.now(),
        creator: "Me",
        body: commentText,
      });
      setCommentText("");
    }
  }, [onAddComment, commentText, issue]);

  const handleFwdPrev = useCallback(
    async (direction: "prev" | "fwd") => {
      if (currentIssueIdx === undefined) {
        return;
      }
      let newIss = undefined;
      if (direction === "prev") {
        if (currentIssueIdx === 0) {
          return;
        }
        newIss = issues[currentIssueIdx - 1].id;
      } else {
        if (currentIssueIdx === issues.length - 1) {
          return;
        }
        newIss = issues[currentIssueIdx + 1].id;
      }

      await setDetailView(
        { iss: newIss },
        {
          scroll: false,
          shallow: true,
        }
      );
    },
    [currentIssueIdx, issues, setDetailView]
  );

  const handleFwd = useCallback(async () => {
    await handleFwdPrev("fwd");
  }, [handleFwdPrev]);

  const handlePrev = useCallback(async () => {
    await handleFwdPrev("prev");
  }, [handleFwdPrev]);

  useKeyPressed("j", handleFwd);
  useKeyPressed("k", handlePrev);

  const handleCancel = () => {
    setEditMode(false);
  };

  const handleSave = () => {
    handleChangeDescription(descriptionText);
    handleChangeTitle(titleText || (issue?.title as string));
    setEditMode(false);
  };

  return (
    <div className="flex flex-col flex-grow m-3 rounded-md shadow-mdw-7xl	border-gray-400 border min-h-0">
      <div className="flex bg-gray-400 border border-gray-300 justify-around">
        <div className="flex-1 p-2">
          <div className="flex flex-row flex-initial ml-3">
            <div
              className="inline-flex items-center justify-center h-6 w-6 rounded  hover:bg-gray-410  cursor-pointer"
              onClick={handleClickCloseBtn}
            >
              <CloseIcon className="w-4" />
            </div>
            {currentIssueIdx >= 0 && (
              <>
                <div className="flex flex-row flex-initial select-none cursor-pointer">
                  <button
                    className="h-6 px-2 rounded border-solid border inline-flex items-center justify-center flex-shrink-0 font-medium m-0 select-none whitespace-no-wrap ml-2  hover:bg-gray-410 disabled:opacity-25"
                    type="button"
                    onClick={() => handleFwdPrev("prev")}
                    disabled={currentIssueIdx === 0}
                  >
                    <ArrowIcon style={{ transform: "rotate(180deg)" }} />
                  </button>
                </div>
                <div
                  role="button"
                  className="flex flex-row flex-initial select-none cursor-pointer"
                >
                  <button
                    className="h-6 px-2 rounded border-solid border inline-flex items-center justify-center flex-shrink-0 font-medium m-0 select-none whitespace-no-wrap ml-2  hover:bg-gray-410 disabled:opacity-50"
                    type="button"
                    onClick={() => handleFwdPrev("fwd")}
                    disabled={currentIssueIdx === issues.length - 1}
                  >
                    <ArrowIcon />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex flex-1 p-2 overflow-hidden">
        <div className="flex flex-col flex-[3_3_0%] items-center md:p-3 border-gray-300 md:border-r min-h-0 overflow-auto">
          <div className="flex flex-col lg:max-w-4xl max-w-[90vw]">
            <div className="flex border-solid border-b lg:px-3 justify-between px-2">
              <div className="flex visible md:invisible">
                <StatusMenu
                  onSelect={handleChangeStatus}
                  status={issue?.status || Status.BACKLOG}
                  labelVisible={true}
                />
                <PriorityMenu
                  onSelect={handleChangePriority}
                  labelVisible={true}
                  priority={issue?.priority || Priority.NONE}
                />
              </div>
              {editMode ? (
                <div className="text-sm flex mb-2">
                  <button
                    className="px-3 ml-2 rounded hover:bg-indigo-700 h-7 focus:outline-none bg-gray-400 text-white"
                    onClick={handleSave}
                  >
                    Save
                  </button>
                  <button
                    className="px-3 ml-2 rounded hover:bg-indigo-700 h-7 focus:outline-none bg-gray-300 text-white"
                    onClick={handleCancel}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="text-sm">
                  <EditIcon
                    className="!w-4 cursor-pointer"
                    onClick={() => {
                      setEditMode(true);
                    }}
                  />
                </div>
              )}
            </div>
            <div className="flex flex-col border-solid border-b px-5">
              <div className="text-md py-4">
                {editMode ? (
                  <input
                    className="block flex-1 whitespace-pre-wrap text-size-sm w-full bg-gray-400 placeholder-gray-100 placeholder:text-sm"
                    onChange={(e) => setTitle(e.target.value)}
                    defaultValue={issue?.title}
                  />
                ) : (
                  issue?.title
                )}
              </div>
              <div className="text-sm pb-4 text-gray-1 overflow-auto whitespace-pre-wrap">
                {editMode ? (
                  <textarea
                    className="block flex-1 whitespace-pre-wrap text-size-sm w-full bg-gray-400 h-[calc(100vh-340px)] placeholder-gray-100 placeholder:text-sm"
                    onChange={(e) => setDescription(e.target.value)}
                    defaultValue={description}
                  />
                ) : (
                  <Remark>{description}</Remark>
                )}
              </div>
            </div>
            <div className="text-md py-4 px-5 text-gray-4">Comments</div>
            {commentsList(comments)}
            <div className="mx-3 bg-gray-400 flex-1 mx- mt-0 mb-3 flex-1 border-transparent rounded full py-3 px-3 relative whitespace-pre-wrap ">
              <textarea
                className="block flex-1 whitespace-pre-wrap text-size-sm w-full bg-gray-400 min-h-[6rem] placeholder-gray-100 placeholder:text-sm"
                placeholder="Leave a comment ..."
                onChange={(e) => setCommentText(e.target.value)}
              />
              <div className="flex justify-end">
                <button
                  className="px-3 ml-2 mt-2 rounded h-8 focus:outline-none bg-gray-500 text-white "
                  onClick={handleAddComment}
                >
                  Comment
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="hidden md:block flex flex-1 p-3">
          <div className="max-w-4xl mx-auto">
            <div className="flex border-solid border-b px-5">
              {/* For consistent spacing with left col */}
              <div className="text-sm invisible">
                <EditIcon className="!w-4" />
              </div>
            </div>
            <div className="flex flex-col px-5 py-4 text-sm">
              <div className="flex flex-row items-center my-1">
                <div className="w-20">Status</div>
                <StatusMenu
                  onSelect={handleChangeStatus}
                  status={issue?.status || Status.BACKLOG}
                  labelVisible={true}
                />
              </div>
              <div className="flex flex-row items-center my-1">
                <div className="w-20">Priority</div>
                <PriorityMenu
                  onSelect={handleChangePriority}
                  labelVisible={true}
                  priority={issue?.priority || Priority.NONE}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
