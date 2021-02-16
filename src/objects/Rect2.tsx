import React, { MouseEventHandler } from 'react';
import {Data} from '../data';
import {getObjectAttributes} from './attribs';

export function Rect2(
  {data, id, onMouseEnter}: {
    data: Data,
    id: string,
    onMouseEnter: MouseEventHandler
  })
{
  const shape = data.useShapeByID(id);
  if (!shape) {
    return null;
  }
  return <rect {...{...getObjectAttributes(shape), className: 'shape', onMouseEnter}} />;
}
