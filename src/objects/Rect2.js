import React from 'react';
import {useSubscribe} from 'replicache-react-util';
import {getObjectAttributes} from './attribs';

export function Rect2({rep, rk}) {
  const state = useSubscribe(rep, tx => tx.get(rk), null);
  return state && <rect {...getObjectAttributes(state)} />;
}
