import React, { RefObject, useRef, useState } from "react";
import AddIcon from "./assets/icons/add.svg";
import HelpIcon from "./assets/icons/help.svg";
import MenuIcon from "./assets/icons/menu.svg";
import { ItemGroup } from "./item-group";
import { useClickOutside } from "./hooks/useClickOutside";
import classnames from "classnames";
import IssueModal from "./issue-modal";
import ReactLogo from "./assets/images/logo.svg";
import type { Description, Issue } from "./issue";
import { queryTypes, useQueryState, useQueryStates } from "next-usequerystate";
import AboutModal from "./about-modal";
import { noop } from "lodash";
import { Button } from "./button";
import { SearchBox } from "./searchbox";
import { Dialog } from "@radix-ui/themes";

interface Props {
  // Show menu (for small screen only)
  menuVisible: boolean;
  onCloseMenu?: () => void;
  onCreateIssue: (
    i: Omit<Issue, "kanbanOrder">,
    description: Description
  ) => void;
}

const LeftMenu = ({
  menuVisible,
  onCloseMenu = noop,
  onCreateIssue,
}: Props) => {
  const [, setLayoutViewParams] = useQueryStates(
    { view: queryTypes.string, iss: queryTypes.string },
    { history: "push" }
  );

  const [disableAbout] = useQueryState("disableAbout");

  const ref = useRef<HTMLDivElement>() as RefObject<HTMLDivElement>;
  const [issueModalVisible, setIssueModalVisible] = useState(false);
  const [aboutModalVisible, setAboutModalVisible] = useState(false);

  const classes = classnames(
    "absolute lg:static inset-0 lg:relative lg:translate-x-0 flex flex-col flex-shrink-0 w-56 font-sans text-sm border-r lg:shadow-none justify-items-start bg-gray border-gray-850 text-white bg-opacity-1",
    {
      /* eslint-disable @typescript-eslint/naming-convention */
      "-translate-x-full shadow-none": !menuVisible,
      "translate-x-0 shadow-x z-50": menuVisible,
      /* eslint-enable @typescript-eslint/naming-convention */
    }
  );

  useClickOutside(ref, () => {
    if (menuVisible && onCloseMenu) {
      onCloseMenu();
    }
  });

  return (
    <>
      <div className={classes} ref={ref}>
        <button
          className="flex-shrink-0 px-5 ml-2 lg:hidden h-14 focus:outline-none"
          onMouseDown={onCloseMenu}
        >
          <MenuIcon className="w-3.5 text-gray-50 hover:text-gray-100" />
        </button>

        {/* Top menu*/}
        <div className="flex flex-col flex-grow-0 flex-shrink-0 px-5 py-3">
          <div className="mb-5 flex items-center justify-between">
            {/* Project selection */}
            <div
              className="flex items-center p-2 pr-3 rounded cursor-pointer hover:bg-gray-850"
              onMouseDown={async () => {
                await setLayoutViewParams({ view: null, iss: null });
                onCloseMenu && onCloseMenu();
              }}
            >
              <div className="w-8 text-white">
                <ReactLogo />
              </div>
              <div className="text-sm font-medium">React</div>
            </div>
          </div>

          <Dialog.Root>
            <Dialog.Trigger>
              <Button
                icon={AddIcon}
                label="New Issue"
                onClick={() => {
                  setIssueModalVisible(true);
                  onCloseMenu && onCloseMenu();
                }}
              />
            </Dialog.Trigger>
            <IssueModal
              isOpen={issueModalVisible}
              onCreateIssue={onCreateIssue}
            />
          </Dialog.Root>
        </div>

        <div className="flex flex-col flex-shrink flex-grow overflow-y-auto mb-0.5 px-5">
          <SearchBox />

          <ItemGroup
            title="React Issues"
            items={["All", "Active", "Backlog", "Board"]}
            onClick={(item) => async () => {
              await setLayoutViewParams({
                view: item.toLowerCase(),
                iss: null,
              });
              onCloseMenu?.();
            }}
          />

          {/* extra space */}
          <div className="flex flex-col flex-grow flex-shrink" />

          {/* bottom group */}
          <div className="px-2 pb-2 text-gray-50 mt-7">
            <button
              className="inline-flex mt-1 focus:outline-none"
              onMouseDown={() => setAboutModalVisible(true)}
            >
              <HelpIcon className="w-3 mr-2 pt-1 h-4" /> About
            </button>
          </div>
        </div>
      </div>

      {
        <AboutModal
          isOpen={aboutModalVisible && disableAbout !== "true"}
          onDismiss={() => setAboutModalVisible(false)}
        />
      }
    </>
  );
};
export default LeftMenu;
