import MenuIcon from "./assets/icons/menu.svg";
import React from "react";
import SortOutlinedIcon from "@mui/icons-material/SortOutlined";
import type { Issue } from "./issue";

// import IssueFilterModal from './IssueFilterModal';
// import ViewOptionMenu from './ViewOptionMenu';

interface Props {
  title: string;
  onToggleMenu?: () => void;
  issues: Issue[];
}

const TopFilter = ({ title, onToggleMenu, issues }: Props) => {
  // const [filterVisible, setFilterVisible] = useState(false);
  // const [viewOptionVisible, setViewOptionVisible] = useState(false);

  // todo: temporary issues

  return (
    <>
      <div className="flex justify-between flex-shrink-0 pl-2 pr-6 border-b border-gray-400 h-14 lg:pl-9 border-b-color-gray-2">
        {/* left section */}
        <div className="flex items-center">
          <button
            className="flex-shrink-0 h-full px-5 focus:outline-none lg:hidden"
            onClick={onToggleMenu}
          >
            <MenuIcon className="w-3.5 text-gray-500 hover:text-gray-800 dark:text-white dark:hover:text-gray-2" />
          </button>

          <div className="p-1 font-semibold cursor-default hover:bg-gray-2  dark:hover:bg-gray-450">
            {title}
          </div>
          <span>{issues.length}</span>
          <button
            className="px-1 py-0.5 ml-3 border border-gray-3 border-dashed rounded dark:text-white text-gray-500 dark:hover:text-gray-2 hover:border-gray-400 focus:outline-none hover:text-gray-800"
            // onClick={() => setFilterVisible(!filterVisible)}
          >
            + Filter
          </button>
        </div>

        {/* right section */}
        <div className="flex items-center">
          <div
            className="p-2 rounded hover:bg-gray-2 dark:hover:bg-gray-400 cursor-pointer"
            // onClick={() => setViewOptionVisible(true)}
          >
            <SortOutlinedIcon />
          </div>
        </div>
      </div>
      {/* <ViewOptionMenu isOpen={viewOptionVisible} onDismiss={() => setViewOptionVisible(false)} />
            <IssueFilterModal isOpen={filterVisible} onDismiss={() => setFilterVisible(false)} /> */}
    </>
  );
};

export default TopFilter;
