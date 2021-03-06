import { Data } from "./data";
import { Rect } from "./rect";

export function Selection({ data, shapeID }: { data: Data; shapeID: string }) {
  return (
    <Rect
      {...{
        data,
        id: shapeID,
        highlight: true,
      }}
    />
  );
}
