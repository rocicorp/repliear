import type { ChangeEventHandler } from "react";
import type { ReactComponent } from "react-hotkeys";

interface Props {
  onChange: ChangeEventHandler | undefined;
  onFocus?: VoidFunction;
  onBlur?: VoidFunction;
  icon: ReactComponent;
  placeholder: string;
}

export const Input: React.FC<Props> = ({
  onChange,
  onFocus,
  onBlur,
  placeholder,
  icon: Icon,
}) => (
  <>
    <Icon className="w-3.5 h-3.5 mr-2.5 absolute left-2 top-4" />
    <input
      className="my-2 py-2 pl-8 pr-2 items-center w-full bg-gray-800 rounded inline-flex hover:bg-gray-900 border-gray-850 text-sm h-8 placeholder-white focus:placeholder-opacity-0 leading-2"
      onChange={onChange}
      onFocus={onFocus}
      onBlur={onBlur}
      type="search"
      placeholder={placeholder}
    />
  </>
);
