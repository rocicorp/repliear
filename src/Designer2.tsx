import React, {CSSProperties, MouseEvent, useState} from 'react';
import {Rect2} from './objects/Rect2';
import {HotKeys} from 'react-hotkeys';
import {Data} from './data';

export function Designer2({data}: {data: Data}) {
  const ids = data.useShapeIDs();

  // TODO: This should be stored in Replicache too, since we will be rendering
  // other users' selections.
  const [selectedID, setSelectedID] = useState('');
  const [lastDrag, setLastDrag] = useState(null);

  const onMouseDown = (e: MouseEvent, id: string) => {
    setSelectedID(id);
    updateLastDrag(e);
  };

  const onMouseMove = (e: MouseEvent) => {
    if (lastDrag == null) {
      return;
    }
    // This is subtle, and worth drawing attention to:
    // In order to properly resolve conflicts, what we want to capture in
    // mutation arguments is the *intent* of the mutation, not the effect.
    // In this case, the intent is the amount the mouse was moved by, locally.
    // We will apply this movement to whatever the state happens to be when we
    // replay. If somebody else was moving the object at the same moment, we'll
    // then end up with a union of the two vectors, which is what we want!
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

  const updateLastDrag = (e: MouseEvent) => {
    setLastDrag({x: e.clientX, y: e.clientY});
  };

  const handlers = {
    moveLeft: () => data.moveShape({id: selectedID, dx: -1, dy: 0}),
    moveRight: () => data.moveShape({id: selectedID, dx: 1, dy: 0}),
    moveUp: () => data.moveShape({id: selectedID, dx: 0, dy: -1}),
    moveDown: () => data.moveShape({id: selectedID, dx: 0, dy: 1}),
  };

  return (
    <HotKeys {...{keyMap, style: styles.keyboardManager, handlers}}>
      <div {...{className: 'container', style: styles.container, onMouseMove, onMouseUp}}>
        <svg style={styles.svg} width={350} height={400}>
          {ids.map(
            id => <Rect2 key={id} {...{data, id, onMouseDown: (e) => onMouseDown(e, id)}}/>)}
        </svg>
      </div>
    </HotKeys>
  );
}

const keyMap = {
  'moveLeft': ['left', 'shift+left'],
  'moveRight': ['right', 'shift+right'],
  'moveUp': ['up', 'shift+up'],
  'moveDown': ['down', 'shift+down'],
};

const styles = {
  container: {
    position: 'relative',
  } as CSSProperties,
  keyboardManager: {
    outline: 'none'
  },
  svg: {
    backgroundImage: 'url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5'
    + 'vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+CjxyZWN0IHdpZHRoPSIyMCIgaGVpZ2h0'
    + 'PSIyMCIgZmlsbD0iI2ZmZiI+PC9yZWN0Pgo8cmVjdCB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIGZpbGw9I'
    + 'iNGN0Y3RjciPjwvcmVjdD4KPHJlY3QgeD0iMTAiIHk9IjEwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIG'
    + 'ZpbGw9IiNGN0Y3RjciPjwvcmVjdD4KPC9zdmc+)',
  },
};
