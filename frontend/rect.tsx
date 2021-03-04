import React, { MouseEventHandler, useState } from "react";
import { Shape } from "../shared/shape";
import { Data } from "./data";

export function Rect({
  data,
  id,
  highlight,
  onMouseEnter,
  onMouseLeave,
  onMouseDown,
}: {
  data: Data;
  id: string;
  highlight?: boolean;
  onMouseEnter?: MouseEventHandler;
  onMouseLeave?: MouseEventHandler;
  onMouseDown?: MouseEventHandler;
}) {
  const shape = data.useShapeByID(id);
  if (!shape) {
    return null;
  }

  console.log("Rendering rect", shape, highlight);

  return (
    <rect
      {...{
        style: getStyle(shape.blendMode, Boolean(highlight)),
        strokeWidth: highlight ? "2px" : "0",
        stroke: "rgb(74,158,255)",
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

function getStyle(blendMode: string, highlight: boolean): any {
  return {
    mixBlendMode: blendMode,
  };
}

function getTransformMatrix(shape: Shape): any {
  if (!shape.rotate) {
    return null;
  }
  let centerX = shape.width / 2 + shape.x;
  let centerY = shape.height / 2 + shape.y;
  return `rotate(${shape.rotate} ${centerX} ${centerY})`;
}
