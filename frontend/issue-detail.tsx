import React from "react";
import CloseIcon from "./assets/icons/close.svg";

// import type { Replicache } from "replicache";
// import type { M } from "./mutators";

// interface Props {
//   rep: Replicache<M>;
// }

export default function IssueDetail() {
  return (
    <div className="m-3 rounded-md shadow-mdw-7xl	border-gray-400 border h-full">
      <div className="flex bg-gray-400 border border-gray-300">
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
          <div className="flex border-solid border-b my-0 mx-auto px-5">
            <div className="flex-1 text-md pb-4">Issue: #</div>
          </div>
        </div>
        <div className="flex-row w-1/6 p-8"></div>
      </div>
    </div>
  );
}
