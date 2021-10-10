import { Rect } from "./rect";
import { useShape } from "./smoothie";
import { DraggableCore, DraggableEvent, DraggableData } from "react-draggable";
import { Replicache } from "replicache";
import { M } from "./mutators";

export function Selection({
  rep,
  id,
  containerOffsetTop,
}: {
  rep: Replicache<M>;
  id: string;
  containerOffsetTop: number | null;
}) {
  const coords = useShape(rep, id);
  const gripSize = 19;

  const center = (coords: NonNullable<ReturnType<typeof useShape>>) => {
    return {
      x: coords.x + coords.w / 2,
      y: coords.y + coords.h / 2,
    };
  };

  const onResize = (e: DraggableEvent, d: DraggableData) => {
    if (!coords) {
      return;
    }

    const shapeCenter = center(coords);

    const size = (x1: number, x2: number, y1: number, y2: number) => {
      const distanceSqFromCenterToCursor =
        Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2);
      return Math.sqrt(distanceSqFromCenterToCursor / 2) * 2;
    };

    const s0 = size(
      shapeCenter.x,
      d.x - d.deltaX,
      shapeCenter.y,
      d.y - d.deltaY
    );
    const s1 = size(shapeCenter.x, d.x, shapeCenter.y, d.y);

    rep.mutate.resizeShape({ id, ds: s1 - s0 });
  };

  const onRotate = (e: DraggableEvent, d: DraggableData) => {
    if (!coords || containerOffsetTop === null) {
      return;
    }

    const offsetY = d.y - containerOffsetTop;

    const shapeCenter = center(coords);
    const before = Math.atan2(
      offsetY - d.deltaY - shapeCenter.y,
      d.x - d.deltaX - shapeCenter.x
    );
    const after = Math.atan2(offsetY - shapeCenter.y, d.x - shapeCenter.x);

    rep.mutate.rotateShape({ id, ddeg: ((after - before) * 180) / Math.PI });
  };

  if (!coords) {
    return null;
  }

  const { x, y, w, h, r } = coords;

  return (
    <div>
      <Rect
        {...{
          rep,
          id,
          highlight: true,
        }}
      />
      <div
        style={{
          position: "absolute",
          transform: `translate3d(${x}px, ${y}px, 0) rotate(${r}deg)`,
          width: w,
          height: h,
          pointerEvents: "none",
        }}
      >
        <DraggableCore onDrag={onResize}>
          <svg
            width={gripSize}
            height={gripSize}
            style={{
              position: "absolute",
              transform: `translate3d(${w - gripSize / 2 - 2}px, ${
                h - gripSize / 2 - 2
              }px, 0)`,
              cursor: "grab",
              pointerEvents: "all",
            }}
          >
            <rect
              strokeWidth={2}
              stroke="rgb(74,158,255)"
              width={gripSize}
              height={gripSize}
              fill="white"
            />
          </svg>
        </DraggableCore>
        <DraggableCore onDrag={onRotate}>
          <svg
            width={gripSize}
            height={gripSize}
            style={{
              position: "absolute",
              transform: `translate3d(${w + gripSize * 1.5}px, ${
                h / 2 - gripSize / 2
              }px, 0)`,
              cursor: "grab",
              pointerEvents: "all",
            }}
          >
            <ellipse
              cx={gripSize / 2}
              cy={gripSize / 2}
              rx={gripSize / 2 - 1}
              ry={gripSize / 2 - 1}
              strokeWidth={2}
              stroke="rgb(74,158,255)"
              fill="white"
            />
          </svg>
        </DraggableCore>
      </div>
    </div>
  );
}
