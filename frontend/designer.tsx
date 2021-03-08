import React, { CSSProperties, MouseEvent, useState } from "react";
import { Rect } from "./rect";
import { HotKeys } from "react-hotkeys";
import { Data } from "./data";
import { Collaborator } from "./collaborator";
import { Selection } from "./selection";

export function Designer({ data }: { data: Data }) {
  const ids = data.useShapeIDs();
  const overID = data.useOverShapeID();
  const selectedID = data.useSelectedShapeID();
  const collaboratorIDs = data.useCollaboratorIDs(data.clientID);

  const [isDragging, setIsDragging] = useState(false);

  const onMouseDown = (e: MouseEvent, id: string) => {
    data.selectShape({ clientID: data.clientID, shapeID: id });
    setIsDragging(true);
  };

  const onMouseMove = (e: MouseEvent) => {
    data.setCursor({
      id: data.clientID,
      x: e.nativeEvent.offsetX,
      y: e.nativeEvent.offsetY,
    });

    if (!isDragging) {
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
      dx: e.movementX,
      dy: e.movementY,
    });
    setIsDragging(true);
  };

  const onMouseUp = (e: MouseEvent) => {
    setIsDragging(false);
  };

  const handlers = {
    moveLeft: () => data.moveShape({ id: selectedID, dx: -20, dy: 0 }),
    moveRight: () => data.moveShape({ id: selectedID, dx: 20, dy: 0 }),
    moveUp: () => data.moveShape({ id: selectedID, dx: 0, dy: -20 }),
    moveDown: () => data.moveShape({ id: selectedID, dx: 0, dy: 20 }),
    deleteShape: () => {
      // Prevent navigating backward on some browsers.
      event?.preventDefault();
      data.deleteShape(selectedID);
    },
  };

  return (
    <HotKeys {...{ keyMap, style: styles.keyboardManager, handlers }}>
      <div
        {...{
          className: "container",
          style: styles.container,
          onMouseMove,
          onMouseUp,
        }}
      >
        <svg width="100%" height="100%">
          {ids.map((id) => (
            // shapes
            <Rect
              {...{
                key: `shape-${id}`,
                data,
                id,
                onMouseEnter: () =>
                  data.overShape({ clientID: data.clientID, shapeID: id }),
                onMouseLeave: () =>
                  data.overShape({ clientID: data.clientID, shapeID: "" }),
                onMouseDown: (e) => onMouseDown(e, id),
              }}
            />
          ))}

          {
            // self-highlight
            !isDragging && overID && (
              <Rect
                {...{
                  key: `highlight-${overID}`,
                  data,
                  id: overID,
                  highlight: true,
                }}
              />
            )
          }

          {
            // self-selection
            selectedID && (
              <Selection
                {...{
                  key: `selection-${selectedID}`,
                  data,
                  shapeID: selectedID,
                }}
              />
            )
          }
        </svg>
        {
          // collaborators
          // foreignObject seems super buggy in Safari, so instead we do the
          // text labels in an HTML context, then do collaborator selection
          // rectangles as their own independent svg content. Le. Sigh.
          collaboratorIDs.map((id) => (
            <Collaborator
              {...{
                key: `key-${id}`,
                data,
                clientID: id,
              }}
            />
          ))
        }
      </div>
    </HotKeys>
  );
}

const keyMap = {
  moveLeft: ["left", "shift+left"],
  moveRight: ["right", "shift+right"],
  moveUp: ["up", "shift+up"],
  moveDown: ["down", "shift+down"],
  deleteShape: ["del", "backspace"],
};

const styles = {
  container: {
    position: "relative",
    width: "100%",
    height: "100%",
  } as CSSProperties,
  keyboardManager: {
    outline: "none",
    width: "100%",
    height: "100%",
  },
};
