import { Data } from "./data";
import type { Shape } from "../shared/shape";
import { DragEvent, useDrag } from "./drag";
import { Rect } from "./rect";

export function Selection({
  data,
  id,
  containerOffsetTop,
}: {
  data: Data;
  id: string;
  containerOffsetTop: number | null;
}) {
  const shape = data.useShapeByID(id);
  const gripSize = 19;

  const center = (shape: Shape) => {
    return {
      x: shape.x + shape.width / 2,
      y: shape.y + shape.height / 2,
    };
  };

  const onResize = (e: DragEvent) => {
    if (!shape) {
      return;
    }

    const shapeCenter = center(shape);

    const size = (x1: number, x2: number, y1: number, y2: number) => {
      const distanceSqFromCenterToCursor =
        Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2);
      return Math.sqrt(distanceSqFromCenterToCursor / 2) * 2;
    };

    const s0 = size(
      shapeCenter.x,
      e.pageX - e.movementX,
      shapeCenter.y,
      e.pageY - e.movementY
    );
    const s1 = size(shapeCenter.x, e.pageX, shapeCenter.y, e.pageY);

    data.resizeShape({ id, ds: s1 - s0 });
  };

  const onRotate = (e: DragEvent) => {
    if (!shape || containerOffsetTop === null) {
      return;
    }

    const offsetY = e.pageY - containerOffsetTop;

    const shapeCenter = center(shape);
    const before = Math.atan2(
      offsetY - e.movementY - shapeCenter.y,
      e.pageX - e.movementX - shapeCenter.x
    );
    const after = Math.atan2(offsetY - shapeCenter.y, e.pageX - shapeCenter.x);

    data.rotateShape({ id, ddeg: ((after - before) * 180) / Math.PI });
  };

  const resizer = useDrag({ onDrag: onResize });
  const rotator = useDrag({ onDrag: onRotate });

  if (!shape) {
    return null;
  }

  return (
    <div>
      <Rect
        {...{
          data,
          id,
          highlight: true,
        }}
      />
      <div
        style={{
          position: "absolute",
          transform: `translate3d(${shape.x}px, ${shape.y}px, 0) rotate(${shape.rotate}deg)`,
          width: shape.width,
          height: shape.height,
          pointerEvents: "none",
        }}
      >
        <svg
          width={gripSize}
          height={gripSize}
          style={{
            position: "absolute",
            transform: `translate3d(${shape.width - gripSize / 2 - 2}px, ${
              shape.height - gripSize / 2 - 2
            }px, 0)`,
            cursor: "grab",
            pointerEvents: "all",
          }}
          {...resizer}
        >
          <rect
            strokeWidth={2}
            stroke="rgb(74,158,255)"
            width={gripSize}
            height={gripSize}
            fill="white"
          />
        </svg>
        <svg
          width={gripSize}
          height={gripSize}
          style={{
            position: "absolute",
            transform: `translate3d(${shape.width + gripSize * 1.5}px, ${
              shape.height / 2 - gripSize / 2
            }px, 0)`,
            cursor: "grab",
            pointerEvents: "all",
          }}
          {...rotator}
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
      </div>
    </div>
  );
}
