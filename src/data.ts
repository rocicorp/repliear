import Replicache, {JSONObject, ReadTransaction, WriteTransaction} from 'replicache';
import {useSubscribe} from 'replicache-react-util';

export interface Shape {
  type: string,
  x: number,
  y: number,
  width: number,
  height: number,
  rotate: number,
  strokeWidth: number,
  fill: string,
  radius: number,
  blendMode: string,
}

export class Data {
  private rep: Replicache;

  constructor(rep: Replicache) {
    this.rep = rep;

    // TODO: Is there a way to consolidate the type information and re-use what is declared below?
    this.moveShape = rep.register('moveShape', async (tx: WriteTransaction, args: {id: string, dx: number, dy: number}) => {
      const {id, dx, dy} = args;
      const shape = await this.getShape(tx, id);
      shape.x += dx;
      shape.y += dy;
      await this.putShape(tx, id, shape);
    });
  }

  readonly moveShape: (args: {id: string, dx: number, dy: number}) => Promise<void>;

  useShapeIDs(): Array<string> {
    return useSubscribe(this.rep, async (tx: ReadTransaction) => {
      const shapes = await tx.scanAll({prefix:'/object/'});
      return shapes.map(([k, _]) => k.split('/')[2]);
    }, []);
  }

  useShapeByID(id: string): Shape|null {
    return useSubscribe(this.rep, (tx: ReadTransaction) => {
      return this.getShape(tx, id);
    }, null, [id]);
  }

  private async getShape(tx: ReadTransaction, id: string): Promise<Shape> {
    // TODO: Is there an automated way to check that the returned value implements Shape?
    return id == '' ? null : await tx.get(`/object/${id}`) as unknown as Shape;
  }
  private async putShape(tx: WriteTransaction, id: string, shape: Shape) {
    return await tx.put(`/object/${id}`, shape as unknown as JSONObject) as unknown as Shape;
  }
}
