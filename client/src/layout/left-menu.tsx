import React, {RefObject, useRef, useState} from 'react';
import AddIcon from '../assets/icons/add.svg?react';
import HelpIcon from '../assets/icons/help.svg?react';
import MenuIcon from '../assets/icons/menu.svg?react';
import ItemGroup from './item-group';
import {useClickOutside} from '../hooks/useClickOutside';
import classnames from 'classnames';
import SearchBox from '../widgets/searchbox';
import IssueModal from '../issue/issue-modal';
import ReactLogo from '../assets/images/logo.svg?react';
import AboutModal from '../about-modal';
import {noop} from 'lodash';
import {useIssueDetailState, useViewState} from '../hooks/query-state-hooks';
import useQueryState, {identityProcessor} from '../hooks/useQueryState';
import {Description, Issue} from 'shared';

interface Props {
  // Show menu (for small screen only)
  menuVisible: boolean;
  onCloseMenu?: () => void;
  onCreateIssue: (
    i: Omit<Issue, 'kanbanOrder'>,
    description: Description,
  ) => void;
}

const LeftMenu = ({menuVisible, onCloseMenu = noop, onCreateIssue}: Props) => {
  const [, setView] = useViewState();
  const [, setIss] = useIssueDetailState();
  const [disableAbout] = useQueryState('disableAbout', identityProcessor);

  const ref = useRef<HTMLDivElement>() as RefObject<HTMLDivElement>;
  const [issueModalVisible, setIssueModalVisible] = useState(false);
  const [aboutModalVisible, setAboutModalVisible] = useState(true);

  const classes = classnames(
    'absolute lg:static inset-0 lg:relative lg:translate-x-0 flex flex-col flex-shrink-0 w-56 font-sans text-sm border-r lg:shadow-none justify-items-start bg-gray border-gray-850 text-white bg-opacity-1',
    {
      /* eslint-disable @typescript-eslint/naming-convention */
      '-translate-x-full shadow-none': !menuVisible,
      'translate-x-0 shadow-x z-50': menuVisible,
      /* eslint-enable @typescript-eslint/naming-convention */
    },
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
          <div className="flex items-center justify-between">
            {/* Project selection */}
            <div
              className="flex items-center p-2 pr-3 rounded cursor-pointer hover:bg-gray-850"
              onMouseDown={async () => {
                await Promise.all([setView(null), setIss(null)]);
                onCloseMenu && onCloseMenu();
              }}
            >
              <div className="w-8 text-white">
                <ReactLogo />
              </div>
              <div className="text-sm font-medium">React</div>
            </div>
          </div>

          {/* Create issue btn */}
          <button
            className="inline-flex items-center px-2 py-2 mt-3 bg-gray-850  hover:bg-gray-900 border border-gray rounded focus:outline-none h-7"
            onMouseDown={() => {
              setIssueModalVisible(true);
              onCloseMenu && onCloseMenu();
            }}
          >
            <AddIcon className="mr-2.5 w-3.5 h-3.5" /> New Issue
          </button>
        </div>

        {/* Search box */}
        <div className="flex flex-col flex-shrink flex-grow overflow-y-auto mb-0.5 px-4">
          <SearchBox placeholder="Search" className="mt-5" />
          {/* actions */}

          <ItemGroup title="React Issues">
            <div
              className="flex items-center pl-9 rounded cursor-pointer group h-8 hover:bg-gray-900"
              onMouseDown={async () => {
                await Promise.all([setView('all'), setIss(null)]);
                onCloseMenu && onCloseMenu();
              }}
            >
              <span>All</span>
            </div>

            <div
              className="flex items-center pl-9 rounded cursor-pointer group h-8 hover:bg-gray-900"
              onMouseDown={async () => {
                await Promise.all([setView('active'), setIss(null)]);
                onCloseMenu && onCloseMenu();
              }}
            >
              <span>Active</span>
            </div>

            <div
              className="flex items-center pl-9 rounded cursor-pointer group h-8 hover:bg-gray-900"
              onMouseDown={async () => {
                await Promise.all([setView('backlog'), setIss(null)]);
                onCloseMenu && onCloseMenu();
              }}
            >
              <span>Backlog</span>
            </div>
            <div
              className="flex items-center pl-9 rounded cursor-pointer group h-8 hover:bg-gray-900"
              onMouseDown={async () => {
                console.log('setting view to board');
                await Promise.all([setView('board'), setIss(null)]);
                onCloseMenu && onCloseMenu();
              }}
            >
              <span>Board</span>
            </div>
          </ItemGroup>

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
      {/* Modals */}
      {
        <IssueModal
          isOpen={issueModalVisible}
          onDismiss={() => setIssueModalVisible(false)}
          onCreateIssue={onCreateIssue}
        />
      }
      {
        <AboutModal
          isOpen={aboutModalVisible && disableAbout !== 'true'}
          onDismiss={() => setAboutModalVisible(false)}
        />
      }
    </>
  );
};
export default LeftMenu;
