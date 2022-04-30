import React, { useCallback, useState } from "react";
import CloseIcon from "./assets/icons/close.svg";
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

interface Props {
  onUpdateIssues: (issueUpdates: IssueUpdate[]) => void;
  onAddComment: (comment: Comment) => void;
  rep: Replicache<M>;
}

const commentsList = (comments: Comment[]) => {
  return comments.map((comment) => (
    <div
      key={comment.id}
      className="mx-5 bg-gray-400 flex-1 mx-0 mt-0 mb-5 flex-1 border-transparent rounded max-w-full py-3 px-4 relative whitespace-pre-wrap "
    >
      <div className="h-6 mb-1 -mt-px relative">{comment.creator}</div>
      <div className="block flex-1 whitespace-pre-wrap">
        <Remark>{comment.body}</Remark>
      </div>
    </div>
  ));
};

export default function IssueDetail({
  rep,
  onUpdateIssues,
  onAddComment,
}: Props) {
  const [detailView, setDetailView] = useQueryStates({
    view: queryTypes.string,
    iss: queryTypes.string,
  });

  const [editMode, setEditMode] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [titleText, setTitle] = useState("");
  const [descriptionText, setDescription] = useState("");

  const { iss } = detailView;
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

  const handleClickCloseBtn = async () => {
    await setDetailView(
      { view: null, iss: null },
      {
        scroll: false,
        shallow: true,
      }
    );
  };

  const handleCancel = () => {
    setEditMode(false);
  };

  const handleSave = () => {
    handleChangeDescription(descriptionText);
    handleChangeTitle(titleText);
    setEditMode(false);
  };

  return (
    <div className="m-3 rounded-md shadow-mdw-7xl	border-gray-400 border">
      <div className="flex bg-gray-400 border border-gray-300 justify-around">
        <div className="flex-1 p-4">
          <div
            className="inline-flex items-center justify-center ml-2 h-7 w-7 rounded  hover:bg-gray-1 hover-text-gray-1 text-white cursor-pointer"
            onClick={handleClickCloseBtn}
          >
            <CloseIcon className="w-4" />
          </div>
        </div>
      </div>
      <div className="flex w-full p-4 h-full overflow-auto">
        <div className=" flex-row w-3/4 p-8 border-gray-300 border-r my-2 overflow-auto h-[calc(100vh-140px)] ">
          <div className="max-w-4xl mx-auto">
            <div className="flex border-solid border-b my-0 mx-auto px-5 justify-between">
              <div className="text-md pb-4">{issue?.id}</div>
              {editMode ? (
                <div className="text-sm">
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
                    className="!w-4 mx-4 cursor-pointer"
                    onClick={() => {
                      setEditMode(true);
                    }}
                  />
                </div>
              )}
            </div>
            <div className="flex flex-col border-solid border-b my-0 mx-auto px-5">
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
              <div className="text-sm pb-4 text-gray-1">
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
              <div className=" pb-4">
                <a
                  href=""
                  className="text-md hover:text-gray-1 visited:text-gray-100 text-gray-200"
                >
                  View original issue in GitHub
                </a>
              </div>
            </div>
            <div className="text-md py-4 px-5 text-gray-4">Comments</div>
            {commentsList(comments)}
            <div className="mx-5 bg-gray-400 flex-1 mx-0 mt-0 mb-5 flex-1 border-transparent rounded max-w-full py-3 px-4 relative whitespace-pre-wrap ">
              <textarea
                className="block flex-1 whitespace-pre-wrap text-size-sm w-full bg-gray-400 min-h-[6rem] placeholder-gray-100 placeholder:text-sm"
                placeholder="Leave a comment ..."
                onChange={(e) => setCommentText(e.target.value)}
              />
              <div className="flex justify-end">
                <button
                  className="px-3 ml-2 mt-3 rounded h-8 focus:outline-none bg-gray-500 text-white "
                  onClick={handleAddComment}
                >
                  Comment
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="flex-row w-1/4 p-8 my-2">
          <div className="max-w-4xl mx-auto">
            <div className="flex border-solid border-b my-0 mx-auto px-5">
              <div className="text-md pb-4">{issue?.id}</div>
            </div>
            <div className="flex flex-row">
              <div className="flex-initial p-4">
                <div className="w-[85px] text-md">Status</div>
              </div>
              <div className="flex-initial p-4">
                <StatusMenu
                  onSelect={handleChangeStatus}
                  status={issue?.status || Status.BACKLOG}
                  labelVisible={true}
                  wideMode={true}
                />
              </div>
            </div>

            <div className="flex flex-row  flex-grow overflow-y-auto">
              <div className="flex-initial p-4">
                <div className="w-[85px] text-md">Priority</div>
              </div>
              <div className="flex-initial p-4">
                <PriorityMenu
                  onSelect={handleChangePriority}
                  labelVisible={true}
                  priority={issue?.priority || Priority.NONE}
                  wideMode={true}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
