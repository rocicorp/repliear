import React, { MouseEventHandler, useState } from "react";
import { Shape } from "../shared/shape";
import { Data } from "./data";

export function Rect({
  data,
  id,
  onMouseDown,
}: {
  data: Data;
  id: string;
  onMouseDown: MouseEventHandler;
}) {
  const [over, setOver] = useState(false);
  const shape = data.useShapeByID(id);
  if (!shape) {
    return null;
  }

  console.log("Rendering shape", shape);

  const onMouseEnter = () => setOver(true);
  const onMouseLeave = () => setOver(false);

  return (
    <rect
      {...{
        style: getStyle(shape.blendMode, over),
        transform: getTransformMatrix(shape),
        x: shape.x,
        y: shape.y,
        width: shape.width,
        height: shape.width,
        fill: shape.fill,
        onMouseDown,
        onMouseEnter,
        onMouseLeave,
      }}
    />
  );
}

function getStyle(blendMode: string, over: boolean): any {
  return {
    mixBlendMode: blendMode,
    outlineColor: "rgb(74,158,255)",
    outlineStyle: over ? "solid" : "none",
    outlineWidth: "2px",
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
