import React, {CSSProperties, useState} from 'react';
import {Rect2} from './objects/Rect2';
import {Handler} from './Handler2';
import {Data} from './data';

export function Designer2({data}: {data: Data}) {
  const ids = data.useShapeIDs();

  // TODO: This should be stored in Replicache too, since we will be rendering
  // other users' selections.
  const [selectedID, setSelectedID] = useState('');

  return <div style={styles.container}>
    <Handler {...{data, selectedID, onMouseLeave: () => setSelectedID('')}}/>
    <svg style={styles.svg} width={350} height={400}>
      {ids.map(
        id => <Rect2 key={id} {...{data, id, onMouseEnter: () => setSelectedID(id)}}/>)}
    </svg>
  </div>;
}

const styles = {
  container: {
    position: 'relative',
  } as CSSProperties,
  svg: {
    backgroundImage: 'url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5'
    + 'vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+CjxyZWN0IHdpZHRoPSIyMCIgaGVpZ2h0'
    + 'PSIyMCIgZmlsbD0iI2ZmZiI+PC9yZWN0Pgo8cmVjdCB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIGZpbGw9I'
    + 'iNGN0Y3RjciPjwvcmVjdD4KPHJlY3QgeD0iMTAiIHk9IjEwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIG'
    + 'ZpbGw9IiNGN0Y3RjciPjwvcmVjdD4KPC9zdmc+)',
  },
};
