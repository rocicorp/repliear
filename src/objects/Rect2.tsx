import React, { MouseEventHandler, useState } from 'react';
import {Data} from '../data';
import {getObjectAttributes} from './attribs';

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
