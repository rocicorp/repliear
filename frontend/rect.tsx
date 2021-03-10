import React, { MouseEventHandler, TouchEventHandler } from "react";
import { Data } from "./data";

export function Rect({
  data,
  id,
  highlight = false,
  highlightColor = "rgb(74,158,255)",
  onMouseDown,
  onTouchStart,
  onMouseEnter,
  onMouseLeave,
}: {
  data: Data;
  id: string;
  highlight?: boolean;
  highlightColor?: string;
  onMouseDown?: MouseEventHandler;
  onTouchStart?: TouchEventHandler;
  onMouseEnter?: MouseEventHandler;
  onMouseLeave?: MouseEventHandler;
}) {
  const shape = data.useShapeByID(id);
  if (!shape) {
    return null;
  }

  const enableEvents =
    onMouseDown || onTouchStart || onMouseEnter || onMouseLeave;

  return (
    <svg
      {...{
        style: {
          position: "absolute",
          left: -1,
          top: -1,
          transform:
            `translate3d(${shape.x}px, ${shape.y}px, 0) ` +
            `rotate(${shape.rotate}deg)`,
          pointerEvents: enableEvents ? "all" : "none",
        },
        width: shape.width + 2,
        height: shape.height + 2,
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
          width: shape.width,
          height: shape.height,
          fill: highlight ? "none" : shape.fill,
        }}
      />
    </svg>
  );
}
