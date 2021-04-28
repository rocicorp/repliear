import React, { useRef, useState } from "react";
import { Rect } from "./rect";
import { HotKeys } from "react-hotkeys";
import { Data } from "./data";
import { Collaborator } from "./collaborator";
import { RectController } from "./rect-controller";
import { touchToMouse } from "./events";
import { Selection } from "./selection";
import { DraggableCore, DraggableEvent, DraggableData } from "react-draggable";

export function Designer({ data }: { data: Data }) {
  const ids = data.useShapeIDs();
  const overID = data.useOverShapeID();
  const selectedID = data.useSelectedShapeID();
  const collaboratorIDs = data.useCollaboratorIDs(data.clientID);

  const ref = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);

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

  const onMouseMove = ({ pageX, pageY }: { pageX: number; pageY: number }) => {
    if (ref && ref.current) {
      data.setCursor({
        id: data.clientID,
        x: pageX,
        y: pageY - ref.current.offsetTop,
      });
    }
  };

  return (
    <HotKeys
      {...{
        style: { outline: "none", display: "flex", flex: 1 },
        keyMap,
        handlers,
      }}
    >
      <DraggableCore
        onStart={() => setDragging(true)}
        onStop={() => setDragging(false)}
      >
        <div
          {...{
            ref,
            style: {
              position: "relative",
              display: "flex",
              flex: 1,
              overflow: "hidden",
            },
            onMouseMove,
            onTouchMove: (e) => touchToMouse(e, onMouseMove),
          }}
        >
          {ids.map((id) => (
            // draggable rects
            <RectController
              {...{
                key: `shape-${id}`,
                data,
                id,
              }}
            />
          ))}

          {
            // self-highlight
            !dragging && overID && (
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
                  id: selectedID,
                  highlight: true,
                  containerOffsetTop: ref.current && ref.current.offsetTop,
                }}
              />
            )
          }

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
      </DraggableCore>
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
