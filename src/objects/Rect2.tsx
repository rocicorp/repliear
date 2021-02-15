import React from 'react';
import {Data} from '../data';
import {getObjectAttributes} from './attribs';

export function Rect2({data, id}: {data: Data, id: string}) {
  const shape = data.useShapeByID(id);
  if (!shape) {
    return null;
  }
  return <rect {...getObjectAttributes(shape)} />;
}
