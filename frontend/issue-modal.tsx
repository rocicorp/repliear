import AttachmentIcon from "./assets/icons/attachment.svg";
import OwnerIcon from "./assets/icons/avatar.svg";
import CloseIcon from "./assets/icons/close.svg";
import GitIssueIcon from "./assets/icons/git-issue.svg";
// import LabelIcon from "./assets/icons/label.svg";
import ZoomIcon from "./assets/icons/zoom.svg";
import Modal from "./modal";
import Toggle from "./toggle";
import React, { useState } from "react";
import { Issue, Priority, PriorityEnum, Status } from "./issue";
import { nanoid } from "nanoid";
import PriorityIcon from "./priority-icon";
import { usePopper } from "react-popper";

import HighPriorityIcon from "./assets/icons/signal-strong.svg";
import LowPriorityIcon from "./assets/icons/signal-weak.svg";
import MediumPriorityIcon from "./assets/icons/signal-medium.svg";
import NoPriorityIcon from "./assets/icons/dots.svg";
import UrgentPriorityIcon from "./assets/icons/rounded-claim.svg";

// import { showInfo, showWarning } from 'utils/notification';

// import PriorityMenu from './contextmenu/PriorityMenu';
// import StatusMenu from './contextmenu/StatusMenu';
// import StatusIcon from "./status-icon";

interface Props {
  isOpen: boolean;
  onDismiss?: () => void;
  onCreateIssue: (i: Issue) => void;
}
function getPriorityString(priority: PriorityEnum) {
  switch (priority) {
    case Priority.NONE:
      return "Priority";
    case Priority.HIGH:
      return "High";
    case Priority.MEDIUM:
      return "Medium";
    case Priority.LOW:
      return "Low";
    case Priority.URGENT:
      return "Urgent";
    default:
      return "Priority";
  }
}

export default function IssueModal({
  isOpen,
  onDismiss,
  onCreateIssue,
}: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState(Priority.NONE);
  //   const [status, setStatus] = useState(Status.BACKLOG);

  const [priorityRef, setPriorityRef] = useState<HTMLButtonElement | null>(
    null
  );
  const [popperRef, setPopperRef] = useState<HTMLDivElement | null>(null);
  const [priorityDropDownVisible, setPriorityDropDownVisible] = useState(false);
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
      status: Status.BACKLOG,
    });
    if (onDismiss) onDismiss();
    resetModalState();
  };

  const resetModalState = () => {
    setTitle("");
    setDescription("");
    setPriority(Priority.NONE);
    // setStatus(Status.BACKLOG);
  };

  const handleClickCloseBtn = () => {
    if (onDismiss) onDismiss();
  };

  const handleDropdownClick = () => {
    setPriorityDropDownVisible(!priorityDropDownVisible);
  };

  const statusOpts = [
    [NoPriorityIcon, "No priority", Priority.NONE],
    [UrgentPriorityIcon, "Urgent", Priority.URGENT],
    [HighPriorityIcon, "High", Priority.HIGH],
    [MediumPriorityIcon, "Medium", Priority.MEDIUM],
    [LowPriorityIcon, "Low", Priority.LOW],
  ];

  const { styles, attributes } = usePopper(priorityRef, popperRef, {
    placement: "bottom-start",
    strategy: "fixed",
  });

  const options = statusOpts.map(([Icon, label, priority], idx) => {
    return (
      <div
        key={idx}
        className="flex items-center h-8 px-3 text-gray-500 focus:outline-none hover:text-gray-800 hover:bg-gray-100"
        onClick={() => {
          setPriority(priority);
          setPriorityDropDownVisible(false);
        }}
      >
        <Icon className="mr-3" /> <span>{label}</span>
      </div>
    );
  });

  const body = (
    <div className="flex flex-col w-full py-4">
      {/* header */}
      <div className="flex items-center justify-between flex-shrink-0 px-4">
        <div className="flex items-center">
          <span className="inline-flex items-center p-1 text-gray-400 bg-gray-100 rounded">
            <GitIssueIcon className="w-3 mr-1" />
            <span>GIT</span>
          </span>
          <span className="ml-2 font-normal text-gray-700">› New Issue</span>
        </div>
        <div className="flex items-center">
          <div className="inline-flex items-center justify-center text-gray-500 rounded h-7 w-7 hover:bg-gray-100 hover:text-gray-700">
            <ZoomIcon className="w-3" />
          </div>
          <div
            className="inline-flex items-center justify-center ml-2 text-gray-500 h-7 w-7 hover:bg-gray-100 rouned hover:text-gray-700"
            onClick={handleClickCloseBtn}
          >
            <CloseIcon className="w-4" />
          </div>
        </div>
      </div>
      <div className="flex flex-col flex-1 pb-3.5 overflow-y-auto">
        {/* Issue title */}
        <div className="flex items-center w-full mt-1.5 px-4">
          {/* <StatusMenu
                    id='status-menu'
                    button={<button className='flex items-center justify-center w-6 h-6 border-none rounded focus:outline-none hover:bg-gray-100'><StatusIcon status={status} /></button>}
                    onSelect={(st) => {
                        setStatus(st);
                    }}
                /> */}
          <input
            className="w-full ml-1.5 text-lg font-semibold placeholder-gray-400 border-none h-7 focus:outline-none"
            placeholder="Issue title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {/* Issue description editor */}
        <div className="flex w-full px-4">
          <textarea
            rows={10}
            onBlur={(e) => setDescription(e.target.value)}
            className="w-full mt-4 ml-5 font-normal border-none appearance-none min-h-12 text-md focus:outline-none"
            placeholder="Add description..."
          />
        </div>
      </div>

      {/* Issue labels & priority */}
      <div className="flex items-center px-4 pb-3 mt-1 border-b border-gray-200">
        <button
          className="inline-flex items-center h-6 px-2 text-gray-500 bg-gray-200 border-none rounded focus:outline-none hover:bg-gray-100 hover:text-gray-700"
          ref={setPriorityRef}
          onClick={handleDropdownClick}
        >
          <PriorityIcon priority={priority} className="mr-0.5" />
          <span>{getPriorityString(priority)}</span>
        </button>
        <div
          ref={setPopperRef}
          style={styles.popper}
          {...attributes.popper}
          className="cursor-default bg-white rounded shadow-modal z-100 w-34"
        >
          <div
            style={{
              ...styles.offset,
              display: priorityDropDownVisible ? "" : "none",
            }}
          >
            {options}
          </div>
        </div>

        <button className="inline-flex items-center h-6 px-2 ml-2 text-gray-500 bg-gray-200 border-none rounded focus:outline-none hover:bg-gray-100 hover:text-gray-700">
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
          {/* <input type='checkbox' /> */}
          <Toggle />
          <span className="ml-2 font-normal">Create more</span>
          <button
            className="px-3 ml-2 text-white bg-indigo-600 rounded hover:bg-indigo-700 h-7 focus:outline-none"
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
