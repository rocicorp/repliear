import React, { MouseEventHandler, useState } from 'react';
import {Data} from './data';

export function Rect2({data, id, onMouseDown}: {
    data: Data,
    id: string,
    onMouseDown: MouseEventHandler
  })
{
  const [over, setOver] = useState(false);
  const shape = data.useShapeByID(id);
  if (!shape) {
    return null;
  }

  const onMouseEnter = () => setOver(true);
  const onMouseLeave = () => setOver(false);

  return <rect {...{
    ...getObjectAttributes(shape, over),
    className: 'shape',
    onMouseDown,
    onMouseEnter,
    onMouseLeave}
  } />;
}

function getObjectAttributes(state, over) {
  const style = getStyle(state, over);
  const transform = getTransformMatrix(state);
  delete state.blendMode;
  return {
    style,
    transform,
    ...state,

  };
}

function getStyle(data, over) {
  return {
    mixBlendMode: data.blendMode,
    outlineColor: '#dedede',
    outlineStyle: over ? 'solid' : 'none',
    outlineWidth: '2px',
  }
}

function getTransformMatrix({rotate, x, y, width, height}) {
  if (!rotate) {
    return null;
  }
  let centerX = width / 2 + x;
  let centerY = height / 2 + y;
  return `rotate(${rotate} ${centerX} ${centerY})`;
}
