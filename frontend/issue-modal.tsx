import AttachmentIcon from "./assets/icons/attachment.svg";
import OwnerIcon from "./assets/icons/avatar.svg";
import CloseIcon from "./assets/icons/close.svg";
import GitIssueIcon from "./assets/icons/git-issue.svg";
import ZoomIcon from "./assets/icons/zoom.svg";
import Modal from "./modal";
import Toggle from "./toggle";
import React, { useState } from "react";
import { Issue, Priority, Status } from "./issue";
import { nanoid } from "nanoid";

import PriorityMenu from "./priority-menu";
import StatusMenu from "./status-menu";

// import { showInfo, showWarning } from 'utils/notification';

interface Props {
  isOpen: boolean;
  onDismiss?: () => void;
  onCreateIssue: (i: Issue) => void;
}

export default function IssueModal({
  isOpen,
  onDismiss,
  onCreateIssue,
}: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState(Priority.NONE);
  const [status, setStatus] = useState(Status.BACKLOG);

  const handleSubmit = () => {
    if (title === "") {
      //   showWarning("Please enter a title before submiting", "Title required");
      return;
    }
    onCreateIssue({
      id: nanoid(),
      title,
      description,
      modified: new Date().getTime(),
      priority,
      status,
    });
    if (onDismiss) onDismiss();
    resetModalState();
  };

  const resetModalState = () => {
    setTitle("");
    setDescription("");
    setPriority(Priority.NONE);
    setStatus(Status.BACKLOG);
  };

  const handleClickCloseBtn = () => {
    if (onDismiss) onDismiss();
  };

  const body = (
    <div className="flex flex-col w-full py-4">
      {/* header */}
      <div className="flex items-center justify-between flex-shrink-0 px-4">
        <div className="flex items-center">
          <span className="inline-flex items-center p-1 text-gray-400 bg-gray-2 rounded">
            <GitIssueIcon className="w-3 mr-1" />
            <span>GIT</span>
          </span>
          <span className="ml-2 font-normal text-gray-700 dark:text-white">
            › New Issue
          </span>
        </div>
        <div className="flex items-center">
          <div className="inline-flex items-center justify-center text-gray-500 rounded h-7 w-7 hover:bg-gray-2 hover:text-gray-700 dark:hover:bg-gray-1 dark:hover-text-gray-1 dark:text-white">
            <ZoomIcon className="w-3" />
          </div>
          <div
            className="inline-flex items-center justify-center ml-2 text-gray-500 h-7 w-7 hover:bg-gray-2 rounded hover:text-gray-700 dark:hover:bg-gray-1 dark:hover-text-gray-1 dark:text-white"
            onClick={handleClickCloseBtn}
          >
            <CloseIcon className="w-4" />
          </div>
        </div>
      </div>
      <div className="flex flex-col flex-1 pb-3.5 overflow-y-auto">
        {/* Issue title */}
        <div className="flex items-center w-full mt-1.5 px-4">
          <StatusMenu onSelect={setStatus} status={status} />
          <input
            className="w-full ml-1.5 text-lg font-semibold dark:placeholder-white placeholder-gray-400 bg-white border-none h-7 focus:outline-none dark:bg-gray-450 dark:text-white"
            placeholder="Issue title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {/* Issue description editor */}
        <div className="flex w-full px-4">
          <textarea
            rows={5}
            onBlur={(e) => setDescription(e.target.value)}
            className="w-full mt-4 ml-5 font-normal border-none appearance-none min-h-12 text-md bg-white focus:outline-none dark:placeholder-white dark:bg-gray-450 dark:text-white"
            placeholder="Add description..."
          />
        </div>
      </div>

      {/* Issue labels & priority */}
      <div className="flex items-center px-4 pb-3 mt-1 border-b border-gray-200">
        <PriorityMenu
          onSelect={setPriority}
          labelVisible={true}
          priority={priority}
        />
        <button className="inline-flex items-center h-6 px-2 ml-2 text-gray-500 bg-gray-2 border-none rounded focus:outline-none hover:bg-gray-2 hover:text-gray-1">
          <OwnerIcon className="w-3.5 h-3.5 ml-2 mr-0.5" />
          <span>Assignee</span>
        </button>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between flex-shrink-0 px-4 pt-3">
        <button className="focus:outline-none">
          <AttachmentIcon />
        </button>
        <div className="flex items-center">
          <Toggle />
          <span className="ml-2 font-normal">Create more</span>
          <button
            className="px-3 ml-2 text-white bg-indigo-600 rounded hover:bg-indigo-700 h-7 focus:outline-none dark:bg-gray-500 dark:text-white text-gray-2 bg-gray-1"
            onClick={handleSubmit}
          >
            Save Issue
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <Modal isOpen={isOpen} center={false} size="large" onDismiss={onDismiss}>
      {body}
    </Modal>
  );
}
