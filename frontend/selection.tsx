import { Data } from "./data";
import { DragEvent, useDrag } from "./drag";
import { Rect } from "./rect";

export function Selection({ data, id }: { data: Data; id: string }) {
  const shape = data.useShapeByID(id);
  const gripSize = 19;

  const onDrag = (e: DragEvent) => {
    if (!shape) {
      return;
    }

    const shapeCenter = {
      x: shape.x + shape.width / 2,
      y: shape.y + shape.height / 2,
    };

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

  const drag = useDrag({ onDrag });

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
        {...drag}
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
            ...drag,
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
      </div>
    </div>
  );
}
