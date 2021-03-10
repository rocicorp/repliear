import { useEffect, useState } from "react";
import { Data } from "./data";
import { touchToMouse } from "./events";
import { Rect } from "./rect";

// TODO: In the future I imagine this becoming ShapeController and
// there also be a Shape that wraps Rect and also knows how to draw Circle, etc.
export function RectController({
  data,
  id,
  onDrag,
}: {
  data: Data;
  id: string;
  onDrag: (dragging: boolean) => void;
}) {
  const [lastDrag, setLastDrag] = useState<{
    pageX: number;
    pageY: number;
  } | null>(null);
  const shape = data.useShapeByID(id);

  const onMouseEnter = () =>
    data.overShape({ clientID: data.clientID, shapeID: id });
  const onMouseLeave = () =>
    data.overShape({ clientID: data.clientID, shapeID: "" });

  const onMouseDown = ({ pageX, pageY }: { pageX: number; pageY: number }) => {
    data.selectShape({ clientID: data.clientID, shapeID: id });
    setLastDrag({ pageX, pageY });
    onDrag && onDrag(true);
  };

  const onTouchMove = (e: any) => touchToMouse(e, onMouseMove);
  const onMouseMove = ({ pageX, pageY }: { pageX: number; pageY: number }) => {
    if (!lastDrag) {
      return;
    }

    // This is subtle, and worth drawing attention to:
    // In order to properly resolve conflicts, what we want to capture in
    // mutation arguments is the *intent* of the mutation, not the effect.
    // In this case, the intent is the amount the mouse was moved by, locally.
    // We will apply this movement to whatever the state happens to be when we
    // replay. If somebody else was moving the object at the same moment, we'll
    // then end up with a union of the two vectors, which is what we want!
    data.moveShape({
      id,
      dx: pageX - lastDrag.pageX,
      dy: pageY - lastDrag.pageY,
    });
    setLastDrag({ pageX, pageY });
  };

  const onMouseUp = () => {
    setLastDrag(null);
    onDrag && onDrag(false);
  };

  const dragListeners = {
    mousemove: (e: any) => onMouseMove(e),
    touchmove: (e: any) => onTouchMove(e),
    mouseup: onMouseUp,
    touchend: onMouseUp,
  };

  useEffect(() => {
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

  if (!shape) {
    return null;
  }

  return (
    <Rect
      {...{
        data,
        id,
        highlight: false,
        onMouseDown: (e: any) => onMouseDown(e),
        onTouchStart: (e: any) => touchToMouse(e, onMouseDown),
        onMouseEnter,
        onMouseLeave,
      }}
    />
  );
}
