import React, { MouseEventHandler, TouchEventHandler } from "react";
import { Replicache } from "replicache";
import { M } from "./mutators";
import { useShape } from "./smoothie";
import { useShapeByID } from "./subscriptions";

export function Rect({
  rep,
  id,
  highlight = false,
  highlightColor = "rgb(74,158,255)",
  onMouseDown,
  onTouchStart,
  onMouseEnter,
  onMouseLeave,
}: {
  rep: Replicache<M>;
  id: string;
  highlight?: boolean;
  highlightColor?: string;
  onMouseDown?: MouseEventHandler;
  onTouchStart?: TouchEventHandler;
  onMouseEnter?: MouseEventHandler;
  onMouseLeave?: MouseEventHandler;
}) {
  const shape = useShapeByID(rep, id);
  const coords = useShape(rep, id);
  if (!shape || !coords) {
    return null;
  }

  const { x, y, w, h, r } = coords;
  const enableEvents =
    onMouseDown || onTouchStart || onMouseEnter || onMouseLeave;

  return (
    <svg
      {...{
        style: {
          position: "absolute",
          left: -1,
          top: -1,
          transform: `translate3d(${x}px, ${y}px, 0) rotate(${r}deg)`,
          pointerEvents: enableEvents ? "all" : "none",
        },
        width: w + 2,
        height: h + 2,
        onMouseDown,
        onTouchStart,
        onMouseEnter,
        onMouseLeave,
      }}
    >
      <rect
        {...{
          x: 1, // To make room for stroke
          y: 1,
          strokeWidth: highlight ? "2px" : "0",
          stroke: highlightColor,
          width: w,
          height: h,
          fill: highlight ? "none" : shape.fill,
        }}
      />
    </svg>
  );
}
