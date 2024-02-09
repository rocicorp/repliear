import classNames from "classnames";
import type { MouseEventHandler } from "react";
import type { ReactComponent } from "react-hotkeys";

interface Props {
  onClick: MouseEventHandler;
  icon?: ReactComponent;
  label: string;
  className?: string;
}

export const MenuItem: React.FC<Props> = ({
  onClick,
  icon: Icon,
  label,
  className,
  ...args
}) => (
  <div
    className={classNames(
      "flex items-center h-8 px-3 text-gray focus:outline-none hover:text-gray-800 hover:bg-gray-100",
      className
    )}
    onClick={onClick}
    {...args}
  >
    {!!Icon && <Icon className="mr-3" />}
    <span>{label}</span>
  </div>
);
