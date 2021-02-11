import React, { Component } from 'react';
import Designer from '../../src/Designer';
import Replicache from 'replicache';
import {useSubscribe} from 'replicache-react-util';

console.log('vercel', process.env);
const rep = new Replicache({
  clientViewURL: new URL('/api/replicache-client-view', location.href).toString(),
  diffServerURL: process.env.VERCEL ? 'https://serve.replicache.dev/pull' : 'http://localhost:7001/pull',
  diffServerAuth: process.env.VERCEL ? '1000000' : 'sandbox',
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
