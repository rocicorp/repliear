import React, { RefObject, useRef, useState } from "react";
import AddIcon from "./assets/icons/add.svg";
import HelpIcon from "./assets/icons/help.svg";
import MenuIcon from "./assets/icons/menu.svg";
import Link from "next/link";
import ItemGroup from "./item-group";
import { useClickOutside } from "./hooks/useClickOutside";
import classnames from "classnames";
import SearchBox from "./searchbox";
import IssueModal from "./issue-modal";
import type { Issue } from "./issue";
import ReactLogo from "./assets/images/logo.svg";
interface Props {
  // Show menu (for small screen only)
  menuVisible: boolean;
  onCloseMenu?: () => void;
  onCreateIssue: (i: Issue) => void;
}

const LeftMenu = ({ menuVisible, onCloseMenu, onCreateIssue }: Props) => {
  const ref = useRef<HTMLDivElement>() as RefObject<HTMLDivElement>;
  const [issueModalVisible, setIssueModalVisible] = useState(false);

  const classes = classnames(
    "absolute lg:static inset-0 transform duration-300 lg:relative lg:translate-x-0 bg-white flex flex-col flex-shrink-0 w-56 font-sans text-sm text-gray-700 border-r border-gray-100 lg:shadow-none justify-items-start",
    {
      /* eslint-disable @typescript-eslint/naming-convention */
      "-translate-x-full ease-out shadow-none": !menuVisible,
      "translate-x-0 ease-in shadow-x z-50": menuVisible,
      /* eslint-enable @typescript-eslint/naming-convention */
    }
  );

  const ready = false;
  useClickOutside(ref, () => {
    if (ready && menuVisible && onCloseMenu) onCloseMenu();
  });

  return (
    <>
      <div className={classes} ref={ref}>
        <button
          className="flex-shrink-0 px-5 ml-2 lg:hidden h-14 focus:outline-none"
          onClick={onCloseMenu}
        >
          <MenuIcon className="w-3.5 text-gray-500 hover:text-gray-800" />
        </button>

        {/* Top menu*/}
        <div className="flex flex-col flex-grow-0 flex-shrink-0 px-5 py-3">
          <div className="flex items-center justify-between">
            {/* Project selection */}
            <div className="flex items-center p-2 pr-3 rounded cursor-pointer hover:bg-gray-100">
              <div className="w-8 text-white">
                <ReactLogo />
              </div>
              <div className="text-sm font-medium">React</div>
            </div>
          </div>

          {/* Create issue btn */}
          <button
            className="inline-flex items-center px-2 py-2 mt-3 bg-white border border-gray-300 rounded hover:bg-gray-100 focus:outline-none h-7"
            onClick={() => {
              setIssueModalVisible(true);
            }}
          >
            <AddIcon className="mr-2.5 w-3.5 h-3.5" /> New Issue
          </button>
        </div>

        {/* Search box */}
        <div className="flex flex-col flex-shrink flex-grow overflow-y-auto mb-0.5 px-4">
          <SearchBox placeholder="Search" className="mt-5" />
          {/* actions */}

          <ItemGroup title="Issues">
            <div className="flex items-center pl-8 rounded cursor-pointer group h-7 hover:bg-gray-100">
              <span className="w-3 h-3 mr-2"></span>
              <Link href="/">
                <span>Active</span>
              </Link>
            </div>
            <div className="flex items-center pl-8 rounded cursor-pointer group h-7 hover:bg-gray-100">
              <span className="w-3 h-3 mr-2"></span>
              <Link href="/">
                <span>Backlog</span>
              </Link>
            </div>
            <div className="flex items-center pl-8 rounded cursor-pointer group h-7 hover:bg-gray-100">
              <span className="w-3 h-3 mr-2"></span>
              <Link href="/board">
                <span>Board</span>
              </Link>
            </div>
          </ItemGroup>

          {/* extra space */}
          <div className="flex flex-col flex-grow flex-shrink" />

          {/* bottom group */}
          <div className="px-2 pb-2 text-gray-500 mt-7">
            <button
              className="inline-flex mt-1 focus:outline-none"
              // onClick={() => setShowHelpModal(true)}
            >
              <HelpIcon className="w-3 mr-2" /> About
            </button>
          </div>
        </div>
      </div>
      {/* Modals */}
      {/* {<HelpModal isOpen={showHelpModal} onDismiss={() => setShowHelpModal(false)} />}
            {<InviteBox isOpen={showInviteModal} onDismiss={() => setShowInviteModal(false)} />} 
          */}
      {
        <IssueModal
          isOpen={issueModalVisible}
          onDismiss={() => setIssueModalVisible(false)}
          onCreateIssue={onCreateIssue}
        />
      }
    </>
  );
};
export default LeftMenu;
