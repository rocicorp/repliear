import { useEffect, useState } from 'react';
import Replicache from 'replicache';
import {Designer2} from '../src/Designer2';

export default function Home() {
  const [rep, setRep] = useState(null);

  // TODO: Think through React under SSR.
  useEffect(() => {
    if (rep) {
      return;
    }

    const isProd = location.host.indexOf('.vercel.app') > -1;
    setRep(new Replicache({
      clientViewURL: new URL('/api/replicache-client-view', location.href).toString(),
      diffServerURL: isProd ? 'https://serve.replicache.dev/pull' : 'http://localhost:7001/pull',
      diffServerAuth: isProd ? '1000000' : 'sandbox',
      wasmModule: '/replicache/replicache.dev.wasm',
      syncInterval: 5000,
    }));
  });

  return rep && <Designer2 rep={rep}/>;
}
