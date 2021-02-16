import React, {CSSProperties, MouseEventHandler} from 'react';
import {Data} from './data';

export function Handler({data, selectedID, onMouseDown, onMouseLeave}:
  {
    data: Data,
    selectedID: string,
    onMouseDown: MouseEventHandler,
    onMouseLeave: MouseEventHandler,
  }) {
  const shape = data.useShapeByID(selectedID);
  if (!shape) {
    return null;
  }

  const handlerStyle = {
    ...styles.handler,
    width: shape.width + 4,
    height: shape.height + 4,
    left: shape.x - 2,
    top: shape.y - 2,
    transform: `rotate(${shape.rotate}deg)`
  };

  return <div {...{
    className: 'handler',
    style: handlerStyle,
    onMouseDown,
    onMouseLeave,
  }}/>;
}

const styles = {
  handler: {
    'position': 'absolute',
    'border': '2px solid #dedede',
    'zIndex': 999999,
  } as CSSProperties,
};
