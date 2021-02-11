import React, { Component } from 'react';
import Designer from '../../src/Designer';
import Replicache from 'replicache';
import {useSubscribe} from 'replicache-react-util';

const rep = new Replicache({
  clientViewURL: new URL('/api/replicache-client-view', location.href).toString(),
  diffServerURL: 'http://localhost:7001/pull',
  diffServerAuth: 'sandbox',
  wasmModule: '/replicache/replicache.wasm',
  syncInterval: 5000,
});

function Mondrian() {
  const objects = useSubscribe(rep, tx => tx.scanAll({prefix:'/object/'}), [])
    .map(([_, v]) => v);
  const handleUpdate = () => {
    // TODO
  };
  return <Designer
    width={350} height={400}
    objects={objects}
    onUpdate={handleUpdate}/>;
}

export default Mondrian;
