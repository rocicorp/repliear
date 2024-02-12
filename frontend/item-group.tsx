import ArrowDropDown from "@mui/icons-material/ArrowDropDown";
import ArrowRight from "@mui/icons-material/ArrowRight";
import { MouseEventHandler, useState } from "react";

interface Props {
  title: string;
  onClick: (item: string) => MouseEventHandler;
  items: string[];
}

export const ItemGroup: React.FC<Props> = ({ title, items, onClick }) => {
  const [isVisible, setVisibility] = useState(true);

  const Icon = isVisible ? ArrowDropDown : ArrowRight;
  return (
    <div className="flex flex-col w-full text-sm">
      <div
        className="px-2 relative w-full mt-0.5 h-8 flex items-center rounded cursor-pointer hover:bg-gray-850"
        onMouseDown={() => setVisibility(!isVisible)}
      >
        <Icon className="mr-1 -ml-1" />
        {title}
      </div>
      {isVisible &&
        items.map((item, idx) => (
          <div
            key={idx}
            className="flex items-center pl-10 rounded cursor-pointer group h-8 hover:bg-gray-900"
            onClick={onClick(item)}
          >
            <span>{item}</span>
          </div>
        ))}
    </div>
  );
};
