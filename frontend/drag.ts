import { useLayoutEffect, useState } from "react";
import { touchToMouse } from "./events";

export type PageCoords = {
  pageX: number;
  pageY: number;
};

export type DragEvent = PageCoords & {
  movementX: number;
  movementY: number;
};

export function useDrag({
  onDragStart,
  onDrag,
  onDragEnd,
}: {
  onDragStart?: () => void;
  onDrag?: (e: DragEvent) => void;
  onDragEnd?: () => void;
}) {
  const [lastDrag, setLastDrag] = useState<{
    pageX: number;
    pageY: number;
  } | null>(null);

  const onTouchStart = (e: any) => touchToMouse(e, onMouseDown);
  const onMouseDown = (e: PageCoords) => {
    setLastDrag(e);
    onDragStart && onDragStart();
  };

  const onTouchMove = (e: any) => touchToMouse(e, onMouseMove);
  const onMouseMove = (e: PageCoords) => {
    if (lastDrag) {
      const { pageX, pageY } = e;
      onDrag &&
        onDrag({
          pageX,
          pageY,
          movementX: pageX - lastDrag.pageX,
          movementY: pageY - lastDrag.pageY,
        });
      setLastDrag(e);
    }
  };

  const onMouseUp = () => {
    setLastDrag(null);
    onDragEnd && onDragEnd();
  };

  const dragListeners = {
    mousemove: (e: any) => onMouseMove(e),
    touchmove: (e: any) => onTouchMove(e),
    mouseup: onMouseUp,
    touchend: onMouseUp,
  };

  useLayoutEffect(() => {
    if (!lastDrag) {
      return;
    }
    Object.entries(dragListeners).forEach(([key, val]) =>
      window.addEventListener(key, val)
    );
    return () => {
      Object.entries(dragListeners).forEach(([key, val]) =>
        window.removeEventListener(key, val)
      );
    };
  });

  return {
    onMouseDown,
    onTouchStart,
  };
}
