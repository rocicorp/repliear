import ReactDOM from 'react-dom/client';
import './index.css';
import {mutators} from './model/mutators';
import {Replicache} from 'replicache';
import {UndoManager} from '@rocicorp/undo';
import App from './app';

async function init() {
  // See https://doc.replicache.dev/licensing for how to get a license key.
  const licenseKey = import.meta.env.VITE_REPLICACHE_LICENSE_KEY;
  if (!licenseKey) {
    throw new Error('Missing VITE_REPLICACHE_LICENSE_KEY');
  }

  const r = new Replicache({
    name: 'anon',
    licenseKey,
    mutators,
    logLevel: 'debug',
    pushURL: `/api/replicache/push`,
    pullURL: `/api/replicache/pull`,
  });
  const undoManager = new UndoManager();

  function Root() {
    return (
      <div className="repliear">
        <App rep={r} undoManager={undoManager} />
      </div>
    );
  }

  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <Root />,
  );
}

await init();
