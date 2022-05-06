import React, { RefObject, useCallback, useRef } from "react";
import ReactDOM from "react-dom";
import classnames from "classnames";

import CloseIcon from "./assets/icons/close.svg";
import useLockBodyScroll from "./hooks/useLockBodyScroll";

interface Props {
  title?: string;
  isOpen: boolean;
  center: boolean;
  className?: string;
  /* function called when modal is closed */
  onDismiss?: () => void;
  children?: React.ReactNode;
  size: "normal" | "large";
}
const sizeClasses = {
  large: "w-175",
  normal: "w-140",
};

function Modal({
  title,
  isOpen,
  center,
  size,
  className,
  onDismiss,
  children,
}: Props) {
  const ref = useRef<HTMLDivElement>(null) as RefObject<HTMLDivElement>;
  const outerRef = useRef(null);

  const wrapperClasses = classnames(
    "fixed flex flex-col items-center inset-0 z-100",
    {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      "justify-center": center,
    }
  );
  const modalClasses = classnames(
    "flex flex-col items-center transform bg-gray-450 modal shadow-large-modal rounded-xl",
    {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      "mt-5 lg:mt-20 mb-2 ": !center,
    },
    sizeClasses[size],
    className
  );
  const handleClick = useCallback((e) => {
    if (!onDismiss) return;
    if (ref.current && !ref.current.contains(e.target)) {
      onDismiss();
    }
  }, []);

  useLockBodyScroll();

  const modal = (
    <div ref={outerRef} onMouseDown={handleClick}>
      <div className={wrapperClasses} style={{ display: isOpen ? "" : "none" }}>
        <div ref={ref} className={modalClasses}>
          {title && (
            <div className="flex items-center justify-between w-full pl-8 pr-4 border-b border-gray-200">
              <div className="text-sm font-semibold text-gray-700">{title}</div>
              <div className="p-4" onClick={onDismiss}>
                <CloseIcon className="w-4 text-gray-500 hover:text-gray-700" />
              </div>
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(
    modal,
    document.getElementById("root-modal") as Element
  );
}

Modal.defaultProps = {
  size: "normal",
  center: true,
};

export default Modal;
