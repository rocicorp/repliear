import { useEffect, useState } from "react";
import { Replicache } from "replicache";
import { M, mutators } from "../../frontend/mutators";
import App from "../../frontend/app";
import Pusher from "pusher-js";
import { UndoManager } from "@rocicorp/undo";

export default function Home() {
  const [rep, setRep] = useState<Replicache<M> | null>(null);
  const [undoManager, setUndoManager] = useState<UndoManager | null>(null);
  const [canUndoRedo, setCanUndoRedo] = useState({
    canUndo: false,
    canRedo: false,
  });
  useEffect(() => {
    // disabled eslint await requirement
    // eslint-disable-next-line
    (async () => {
      if (rep) {
        return;
      }

      const [, , spaceID] = location.pathname.split("/");
      const r = new Replicache({
        pushURL: `/api/replicache-push?spaceID=${spaceID}`,
        pullURL: `/api/replicache-pull?spaceID=${spaceID}`,
        name: spaceID,
        mutators,
        pullInterval: 30000,
        // To get your own license key run `npx replicache get-license`. (It's free.)
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        licenseKey: process.env.NEXT_PUBLIC_REPLICACHE_LICENSE_KEY!,
      });

      if (
        process.env.NEXT_PUBLIC_PUSHER_KEY &&
        process.env.NEXT_PUBLIC_PUSHER_CLUSTER
      ) {
        Pusher.logToConsole = true;
        const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, {
          cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
        });

        const channel = pusher.subscribe("default");
        channel.bind("poke", () => {
          r.pull();
        });
      }
      setUndoManager(
        new UndoManager({
          onChange: setCanUndoRedo,
        })
      );
      setRep(r);
    })();
  }, [rep]);

  if (!rep || !undoManager) {
    return null;
  }
  return (
    <div className="repliear">
      <App rep={rep} canUndoRedo={canUndoRedo} undoManager={undoManager} />
    </div>
  );
}
