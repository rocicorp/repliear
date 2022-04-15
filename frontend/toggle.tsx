import React, { useState } from "react";
import classnames from "classnames";

interface Props {
  className?: string;
}

export default function Toggle({ className }: Props) {
  const [check, setCheck] = useState(false);

  const labelClasses = classnames(
    "absolute h-3.5 w-3.5 overflow-hidden border-2 transition duration-200 ease-linear rounded-full cursor-pointer bg-white",
    {
      /* eslint-disable @typescript-eslint/naming-convention */
      "left-0 border-gray-3": !check,
      "right-0 border-indigo-600": check,
      /* eslint-enable @typescript-eslint/naming-convention */
    }
  );
  const classes = classnames(
    "group relative rounded-full w-5 h-3.5 transition duration-200 ease-linear",
    {
      /* eslint-disable @typescript-eslint/naming-convention */
      "bg-indigo-600 hover:bg-indigo-700": check,
      "bg-gray-300": !check,
      /* eslint-enable @typescript-eslint/naming-convention */
    },
    className
  );
  return (
    <div className={classes} onClick={() => setCheck(!check)}>
      <label className={labelClasses}></label>
    </div>
  );
}
