import React, { MouseEventHandler, useState } from "react";
import { Shape } from "../shared/shape";
import { Data } from "./data";

export function Rect({
  data,
  id,
  highlight = false,
  highlightColor = "rgb(74,158,255)",
  onMouseEnter,
  onMouseLeave,
  onMouseDown,
}: {
  data: Data;
  id: string;
  highlight?: boolean;
  highlightColor?: string;
  onMouseEnter?: MouseEventHandler;
  onMouseLeave?: MouseEventHandler;
  onMouseDown?: MouseEventHandler;
}) {
  const shape = data.useShapeByID(id);
  if (!shape) {
    return null;
  }

  return (
    <rect
      {...{
        style: {
          pointerEvents: highlight ? "none" : "all",
        },
        strokeWidth: highlight ? "2px" : "0",
        stroke: highlightColor,
        transform: getTransformMatrix(shape),
        x: shape.x,
        y: shape.y,
        width: shape.width,
        height: shape.width,
        fill: highlight ? "none" : shape.fill,
        onMouseDown,
        onMouseEnter,
        onMouseLeave,
      }}
    />
  );
}

function getTransformMatrix(shape: Shape): any {
  if (!shape.rotate) {
    return null;
  }
  let centerX = shape.width / 2 + shape.x;
  let centerY = shape.height / 2 + shape.y;
  return `rotate(${shape.rotate} ${centerX} ${centerY})`;
}
