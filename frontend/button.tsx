import type { ReactComponent } from "react-hotkeys";

interface Props {
  onClick: () => unknown;
  icon: ReactComponent;
  label: string;
}

export const Button: React.FC<Props> = ({ onClick, label, icon: Icon }) => (
  <button
    className="h-8 my-2 px-2 py-2 items-center w-full bg-gray-800 rounded inline-flex hover:bg-gray-900"
    onClick={onClick}
  >
    <Icon className="mr-2.5 w-3.5 h-3.5" /> {label}
  </button>
);
