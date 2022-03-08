import { useEffect, useState } from "react";
import { Replicache } from "replicache";
import Pusher from "pusher-js";
import { M, mutators } from "../../frontend/mutators";
import App from "../../frontend/app";

export default function Home() {
  const [rep, setRep] = useState<Replicache<M> | null>(null);

  // TODO: Think through Replicache + SSR.
  useEffect(() => {
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
      });

      Pusher.logToConsole = true;
      var pusher = new Pusher("d9088b47d2371d532c4c", {
        cluster: "us3",
      });
      var channel = pusher.subscribe("default");
      channel.bind("poke", () => {
        r.pull();
      });

      setRep(r);
    })();
  }, []);

  if (!rep) {
    return null;
  }

  return (
    <div className="todoapp">
      <App />
    </div>
  );
}
