import React, {CSSProperties, MouseEvent, useState} from 'react';
import {Rect2} from './objects/Rect2';
import {Handler} from './Handler2';
import {Data} from './data';

export function Designer2({data}: {data: Data}) {
  const ids = data.useShapeIDs();

  // TODO: This should be stored in Replicache too, since we will be rendering
  // other users' selections.
  const [selectedID, setSelectedID] = useState('');
  const [lastDrag, setLastDrag] = useState(null);

  const onMouseEnter = (e: MouseEvent, id: string) => {
    if (fromClass(e, 'shape')) {
      if (lastDrag == null) {
        setSelectedID(id);
      }
    }
  };

  const onMouseLeave = (e: MouseEvent) => {
    if (fromClass(e, 'handler')) {
      if (lastDrag == null) {
        setSelectedID('');
      }
    }
  };

  const onMouseDown = (e: MouseEvent) => {
    updateLastDrag(e);
  };

  const onMouseMove = (e: MouseEvent) => {
    if (lastDrag == null) {
      return;
    }
    data.moveShape({
      id: selectedID,
      dx: e.clientX - lastDrag.x,
      dy: e.clientY - lastDrag.y
    });
    updateLastDrag(e);
  };

  const onMouseUp = (e: MouseEvent) => {
    setLastDrag(null);
  };

  const fromClass = (e: MouseEvent, className: string) => {
    const target = e.target as HTMLElement;
    return target.classList.contains(className);
  };

  const updateLastDrag = (e: MouseEvent) => {
    setLastDrag({x: e.clientX, y: e.clientY});
  }

  return <div {...{className: 'container', style: styles.container, onMouseMove, onMouseUp}}>
    <Handler {...{
      data,
      selectedID,
      onMouseDown,
      onMouseLeave,
    }}/>
    <svg style={styles.svg} width={350} height={400}>
      {ids.map(
        id => <Rect2 key={id} {...{data, id, onMouseEnter: (e) => onMouseEnter(e, id)}}/>)}
    </svg>
  </div>;
}

const styles = {
  container: {
    position: 'relative',
  } as CSSProperties,
  svg: {
    backgroundImage: 'url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5'
    + 'vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+CjxyZWN0IHdpZHRoPSIyMCIgaGVpZ2h0'
    + 'PSIyMCIgZmlsbD0iI2ZmZiI+PC9yZWN0Pgo8cmVjdCB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIGZpbGw9I'
    + 'iNGN0Y3RjciPjwvcmVjdD4KPHJlY3QgeD0iMTAiIHk9IjEwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIG'
    + 'ZpbGw9IiNGN0Y3RjciPjwvcmVjdD4KPC9zdmc+)',
  },
};
