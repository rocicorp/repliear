import React from 'react';
import {useSubscribe} from 'replicache-react-util';
import {Rect2} from './objects/Rect2';

export function Designer2({rep}) {
  const keys = useSubscribe(rep,
    async tx => (await tx.scanAll({prefix: '/object/'})).map(([k]) => k), []);

  return <svg style={styles} width={350} height={400}>
    {keys.map(rk => <Rect2 rep={rep} key={rk} rk={rk}/>)}
  </svg>;
}

const styles = {
  backgroundSize: 400,
  backgroundImage: 'url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5'
    + 'vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+CjxyZWN0IHdpZHRoPSIyMCIgaGVpZ2h0'
    + 'PSIyMCIgZmlsbD0iI2ZmZiI+PC9yZWN0Pgo8cmVjdCB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIGZpbGw9I'
    + 'iNGN0Y3RjciPjwvcmVjdD4KPHJlY3QgeD0iMTAiIHk9IjEwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIG'
    + 'ZpbGw9IiNGN0Y3RjciPjwvcmVjdD4KPC9zdmc+)',
  backgroundSize: "auto"
};
