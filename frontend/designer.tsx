import React, { TouchEvent, useRef, useState } from "react";
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

  const [lastDrag, setLastDrag] = useState<{
    pageX: number;
    pageY: number;
  } | null>(null);
  const nodeRef = useRef<HTMLDivElement | null>(null);

  const onMouseDown = (id: string, pageX: number, pageY: number) => {
    data.selectShape({ clientID: data.clientID, shapeID: id });
    setLastDrag({ pageX, pageY });
  };

  const onMouseMove = (pageX: number, pageY: number) => {
    if (!nodeRef.current) {
      return;
    }

    data.setCursor({
      id: data.clientID,
      x: pageX,
      y: pageY - nodeRef.current.offsetTop,
    });

    if (!lastDrag) {
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
      dx: pageX - lastDrag.pageX,
      dy: pageY - lastDrag.pageY,
    });
    setLastDrag({ pageX, pageY });
  };

  const onMouseUp = () => {
    setLastDrag(null);
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
    <HotKeys
      {...{
        style: { outline: "none", display: "flex", flex: 1 },
        keyMap,
        handlers,
      }}
    >
      <div
        {...{
          ref: nodeRef,
          className: "container",
          style: { position: "relative", display: "flex", flex: 1, overflow: "hidden" },
          onMouseMove: (e) => onMouseMove(e.pageX, e.pageY),
          onTouchMove: (e) => touchToMouse(e, onMouseMove),
          onMouseUp,
          onTouchEnd: () => onMouseUp(),
        }}
      >
        <svg
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: "100%",
            height: "100%",
          }}
        >
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
                onMouseDown: (e) => onMouseDown(id, e.pageX, e.pageY),
                onTouchStart: (e) =>
                  touchToMouse(e, (pageX, pageY) =>
                    onMouseDown(id, pageX, pageY)
                  ),
              }}
            />
          ))}

          {
            // self-highlight
            !lastDrag && overID && (
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

function touchToMouse(
  e: TouchEvent,
  handler: (pageX: number, pageY: number) => void
) {
  if (e.touches.length == 1) {
    const t = e.touches[0];
    handler(t.pageX, t.pageY);
  }
}
