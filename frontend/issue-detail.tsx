import React, { useState } from "react";
import CloseIcon from "./assets/icons/close.svg";
import EditIcon from "@mui/icons-material/Edit";
import PriorityMenu from "./priority-menu";
import { getIssue, Issue, Priority, Status } from "./issue";
import StatusMenu from "./status-menu";
import { useQueryState } from "next-usequerystate";

import type { Replicache } from "replicache";
import type { M } from "./mutators";
import { useSubscribe } from "replicache-react";

interface Props {
  rep: Replicache<M>;
}

export default function IssueDetail({ rep }: Props) {
  const [priority, setPriority] = useState(Priority.NONE);
  const [status, setStatus] = useState(Status.BACKLOG);
  const [, setLayoutViewParam] = useQueryState("view");
  const [issueParam, setIssueParam] = useQueryState("issue");

  const issue = useSubscribe<Issue | null>(
    rep,
    async (tx) => {
      if (issueParam) {
        return (await getIssue(tx, issueParam as string)) || null;
      }
      return null;
    },
    null,
    [issueParam]
  );

  console.log("issue", issue);

  const handleClickCloseBtn = async () => {
    await setLayoutViewParam(null);
    await setIssueParam(null);
  };

  const comments = () => {
    return [
      {
        id: "1",
        name: "Cesar",
        value: "Comment 1",
      },
    ].map((comment) => (
      <div
        key={comment.id}
        className="mx-5 bg-gray-400 flex-1 mx-0 mt-0 mb-5 flex-1 border-transparent rounded max-w-full py-3 px-4 relative whitespace-pre-wrap "
      >
        <div className="h-6 mb-1 -mt-px relative">{comment.name}</div>
        <div className="block flex-1 whitespace-pre-wrap">{comment.value}</div>
      </div>
    ));
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
              <div className="text-sm">
                <EditIcon className="!w-4 mx-4 cursor-pointer" />
                &#8230;
              </div>
            </div>
            <div className="flex flex-col border-solid border-b my-0 mx-auto px-5">
              <div className="text-md py-4">{issue?.title}</div>
              <div className="text-sm pb-4 text-gray-1">
                {issue?.description}
              </div>
              <div className=" pb-4">
                <a
                  href=""
                  className="text-md hover:text-blue-800 visited:text-purple-600"
                >
                  View original issue in GitHub
                </a>
              </div>
            </div>
            <div className="text-md py-4 px-5 text-gray-4">Comments</div>
            {comments()}
            <div className="mx-5 bg-gray-400 flex-1 mx-0 mt-0 mb-5 flex-1 border-transparent rounded max-w-full py-3 px-4 relative whitespace-pre-wrap ">
              <textarea
                className="block flex-1 whitespace-pre-wrap text-size-sm w-full bg-gray-400 min-h-[6rem] placeholder-gray-100 placeholder:text-sm"
                placeholder="Leave a comment ..."
              />
            </div>
          </div>
        </div>
        <div className="flex-row w-1/4 p-8 my-2">
          <div className="max-w-4xl mx-auto">
            <div className="flex border-solid border-b my-0 mx-auto px-5">
              <div className="text-md pb-4">REP-215</div>
            </div>
            <div className="flex flex-row">
              <div className="flex-initial p-4">
                <div className="w-[85px] text-md">Status</div>
              </div>
              <div className="flex-initial p-4">
                <StatusMenu
                  onSelect={setStatus}
                  status={status}
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
                  onSelect={setPriority}
                  labelVisible={true}
                  priority={priority}
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
