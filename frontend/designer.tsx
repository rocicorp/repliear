import React, {CSSProperties, MouseEvent, useState} from 'react';
import {Rect2} from './rect';
import {HotKeys} from 'react-hotkeys';
import {Data} from './data';
import {newID} from'../shared/id';

type LastDrag = {x: number, y: number};
const canvasWidth = 400;
const canvasHeight = 550;
const colors = ['red', 'blue', 'white', 'green', 'yellow'];

export function Designer({data}: {data: Data}) {
  const ids = data.useShapeIDs();

  // TODO: This should be stored in Replicache too, since we will be rendering
  // other users' selections.
  const [selectedID, setSelectedID] = useState('');
  const [lastDrag, setLastDrag] = useState<LastDrag|null>(null);

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
    moveLeft: () => data.moveShape({id: selectedID, dx: -20, dy: 0}),
    moveRight: () => data.moveShape({id: selectedID, dx: 20, dy: 0}),
    moveUp: () => data.moveShape({id: selectedID, dx: 0, dy: -20}),
    moveDown: () => data.moveShape({id: selectedID, dx: 0, dy: 20}),
  };

  const randInt = (min: number, max: number): number => {
    const range = max - min;
    return Math.round(Math.random() * range);
  };

  const onNewRectangle = async () => {
    await data.createShape({
      id: newID(),
      shape: {
        type: 'rect',
        x: randInt(0, canvasWidth - 100),
        y: randInt(0, canvasHeight- 100),
        width: randInt(100, canvasWidth - 100),
        height: randInt(100, canvasHeight - 100),
        rotate: 0,
        strokeWidth: randInt(1, 5),
        fill: colors[randInt(0, colors.length)],
        radius: 0,
        blendMode: 'normal',
      }
    });
  };

  return (
    <HotKeys {...{keyMap, style: styles.keyboardManager, handlers}}>
      <div {...{className: 'container', style: styles.container, onMouseMove, onMouseUp}}>
        <svg style={styles.svg} width={400} height={550}>
          {ids.map(
            id => <Rect2 key={id} {...{data, id, onMouseDown: (e) => onMouseDown(e, id)}}/>)}
        </svg>
        <br/>
        <button onClick={() => onNewRectangle()}>New Rectangle</button>
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
