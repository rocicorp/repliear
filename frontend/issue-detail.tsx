import React, { useState } from "react";
import CloseIcon from "./assets/icons/close.svg";
import EditIcon from "@mui/icons-material/Edit";
import PriorityMenu from "./priority-menu";
import { Priority, Status } from "./issue";
import StatusMenu from "./status-menu";
// import type { Replicache } from "replicache";
// import type { M } from "./mutators";

// interface Props {
//   rep: Replicache<M>;
// }

export default function IssueDetail() {
  const [priority, setPriority] = useState(Priority.NONE);
  const [status, setStatus] = useState(Status.BACKLOG);

  return (
    <div className="m-3 rounded-md shadow-mdw-7xl	border-gray-400 border h-full">
      <div className="flex bg-gray-400 border border-gray-300 justify-around">
        <div className="flex-1 p-4">
          <div
            className="inline-flex items-center justify-center ml-2 h-7 w-7 rounded  hover:bg-gray-1 hover-text-gray-1 text-white"
            // onClick={handleClickCloseBtn}
          >
            <CloseIcon className="w-4" />
          </div>
        </div>
      </div>
      <div className="flex w-full p-4 ">
        <div className=" flex-row w-3/4 p-8 border-gray-300 border-r my-2">
          <div className="max-w-4xl mx-auto">
            <div className="flex border-solid border-b my-0 mx-auto px-5 justify-between">
              <div className="text-md pb-4">Issue: #</div>
              <div className="">
                <EditIcon />
                &#8230;
              </div>
            </div>
            <div className="flex flex-col border-solid border-b my-0 mx-auto px-5">
              <div className="text-lg py-4">
                non-json values seem to bork scan
              </div>
              <div className="text-md pb-4 text-gray-5">
                aaron ran into this and we discussed it in yesterdays sync. even
                if we are moving away from string patch to JSON which would
                eliminate the possibility of non-json in a value, we should make
                sure we log a sensible error in case the value is not json.
                right now it just crashes somewhere in prolly::Map.
              </div>
              <div className=" pb-4">
                <a href="" className="text-md text-blue-700">
                  View original issue in GitHub
                </a>
              </div>
            </div>
          </div>
        </div>
        <div className="flex-row w-1/4 p-8 my-2">
          <div className="max-w-4xl mx-auto">
            <div className="flex border-solid border-b my-0 mx-auto px-5">
              <div className="text-md pb-4">REP-215</div>
            </div>
            <div className="flex flex-row">
              <div className="flex-initial p-5">
                <div className="w-[90px]">Status</div>
              </div>
              <div className="flex-initial w-2 p-5">
                <StatusMenu onSelect={setStatus} status={status} />
              </div>
            </div>

            <div className="flex flex-row  flex-grow overflow-y-auto">
              <div className="flex-initial p-5">
                <div className="w-[90px]">Priority</div>
              </div>
              <div className="flex-initial w-2 p-5">
                <PriorityMenu
                  onSelect={setPriority}
                  labelVisible={true}
                  priority={priority}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
