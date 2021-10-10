import { useEffect, useState } from "react";
import { Replicache } from "replicache";
import { Designer } from "../../frontend/designer";
import { Nav } from "../../frontend/nav";
import Pusher from "pusher-js";
import { M, mutators } from "../../frontend/mutators";
import { randUserInfo } from "../../frontend/client-state";

export default function Home() {
  const [rep, setRep] = useState<Replicache<M> | null>(null);

  // TODO: Think through Replicache + SSR.
  useEffect(() => {
    (async () => {
      if (rep) {
        return;
      }

      const [, , docID] = location.pathname.split("/");
      const r = new Replicache({
        pushURL: `/api/replicache-push?docID=${docID}`,
        pullURL: `/api/replicache-pull?docID=${docID}`,
        useMemstore: true,
        name: docID,
        mutators,
      });

      const defaultUserInfo = randUserInfo();
      await r.mutate.initClientState({
        id: await r.clientID,
        defaultUserInfo,
      });

      Pusher.logToConsole = true;
      var pusher = new Pusher("d9088b47d2371d532c4c", {
        cluster: "us3",
      });
      var channel = pusher.subscribe("default");
      channel.bind("poke", function (data: unknown) {
        r.pull();
      });

      setRep(r);
    })();
  }, []);

  if (!rep) {
    return null;
  }

  return (
    <div
      style={{
        position: "absolute",
        display: "flex",
        flexDirection: "column",
        left: 0,
        top: 0,
        width: "100%",
        height: "100%",
        background: "rgb(229,229,229)",
      }}
    >
      <Nav rep={rep} />
      <Designer {...{ rep }} />
    </div>
  );
}
