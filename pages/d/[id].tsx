import { useEffect, useState } from "react";
import { Replicache } from "replicache";
import { M, mutators } from "../../frontend/mutators";
import App from "../../frontend/app";
import Pusher from "pusher-js";

export default function Home() {
  const [rep, setRep] = useState<Replicache<M> | null>(null);

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

      const pusher = new Pusher("ca0cbe1442bba8f6e8e0", {
        cluster: "mt1",
      });

      const channel = pusher.subscribe("default");
      channel.bind("poke", () => {
        r.pull();
      });
      setRep(r);
    })();
  }, [rep]);

  if (!rep) {
    return null;
  }
  return (
    <div className="repliear">
      <App rep={rep} />
    </div>
  );
}
