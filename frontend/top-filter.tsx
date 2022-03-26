import MenuIcon from "./assets/icons/menu.svg";
import React from "react";
import SortOutlinedIcon from "@mui/icons-material/SortOutlined";
// import IssueFilterModal from './IssueFilterModal';
// import ViewOptionMenu from './ViewOptionMenu';
import { IssuesByStatus as issues } from "../util/issues";

interface Props {
  title: string;
  onToggleMenu?: () => void;
}

const TopFilter = ({ title, onToggleMenu }: Props) => {
  // const [filterVisible, setFilterVisible] = useState(false);
  // const [viewOptionVisible, setViewOptionVisible] = useState(false);

  // todo: temporary issues
  const totalIssues =
    issues.backlog.length +
    issues.todo.length +
    issues.done.length +
    issues.inProgress.length +
    issues.canceled.length;

  return (
    <>
      <div className="flex justify-between flex-shrink-0 pl-2 pr-6 border-b border-gray-200 h-14 lg:pl-9">
        {/* left section */}
        <div className="flex items-center">
          <button
            className="flex-shrink-0 h-full px-5 focus:outline-none lg:hidden"
            onClick={onToggleMenu}
          >
            <MenuIcon className="w-3.5 text-gray-500 hover:text-gray-800" />
          </button>

          <div className="p-1 font-semibold cursor-default hover:bg-gray-100">
            {title}
          </div>
          <span>{totalIssues}</span>
          <button
            className="px-1 py-0.5 ml-3 border border-gray-300 border-dashed rounded text-gray-500 hover:border-gray-400 focus:outline-none hover:text-gray-800"
            // onClick={() => setFilterVisible(!filterVisible)}
          >
            + Filter
          </button>
        </div>

        {/* right section */}
        <div className="flex items-center">
          <div
            className="p-2 rounded hover:bg-gray-100"
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
