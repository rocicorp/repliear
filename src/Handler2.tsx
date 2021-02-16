import React, {CSSProperties} from 'react';
import {Data} from './data';

export function Handler({data, selectedID, onMouseLeave}: {data: Data, selectedID: string, onMouseLeave: () => void}) {
  const shape = data.useShapeByID(selectedID);
  if (!shape) {
    return null;
  }

  let handlerStyle = {
    ...styles.handler,
    width: shape.width + 4,
    height: shape.height + 4,
    left: shape.x - 2,
    top: shape.y - 2,
    transform: `rotate(${shape.rotate}deg)`
  };

  return <div
    style={handlerStyle}
    onMouseLeave={onMouseLeave}>
  </div>;
}

const styles = {
  handler: {
    'position': 'absolute',
    'border': '2px solid #dedede',
    'zIndex': 999999,
  } as CSSProperties,
};
