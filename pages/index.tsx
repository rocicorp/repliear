import { useEffect, useState } from 'react';
import Replicache from 'replicache';
import {Data} from '../src/data';
import {Designer2} from '../src/Designer2';

export default function Home() {
  const [data, setData] = useState(null);

  // TODO: Think through Replicache + SSR.
  useEffect(() => {
    if (data) {
      return;
    }
    // TODO: Use clientID from Replicache:
    // https://github.com/rocicorp/replicache-sdk-js/issues/275
    let clientID = localStorage.clientID;
    if (!clientID) {
      clientID = localStorage.clientID = Math.random().toString(36).substring(2);
    }

    const isProd = location.host.indexOf('.vercel.app') > -1;
    const rep = new Replicache({
      clientViewURL: new URL('/api/replicache-client-view', location.href).toString(),
      diffServerURL: isProd ? 'https://serve.replicache.dev/pull' : 'http://localhost:7001/pull',
      diffServerAuth: isProd ? '1000000' : 'sandbox',
      wasmModule: '/replicache/replicache.dev.wasm',
      syncInterval: 5000,
    });

    setData(new Data(rep));
  });

  return data && <Designer2 {...{data}}/>;
}
