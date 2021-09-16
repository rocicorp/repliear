import { useEffect, useState } from "react";
import { Replicache } from "replicache";
import { createData, mutators } from "../../frontend/data";
import { Designer } from "../../frontend/designer";
import { Nav } from "../../frontend/nav";
import Pusher from "pusher-js";

import type { Data } from "../../frontend/data";
import { randUserInfo } from "../../shared/client-state";

export default function Home() {
  const [data, setData] = useState<Data | null>(null);

  // TODO: Think through Replicache + SSR.
  useEffect(() => {
    (async () => {
      if (data) {
        return;
      }

      const [, , docID] = location.pathname.split("/");
      const isProd = location.host.indexOf(".vercel.app") > -1;
      const rep = new Replicache({
        pushURL: `/api/replicache-push?docID=${docID}`,
        pullURL: `/api/replicache-pull?docID=${docID}`,
        useMemstore: true,
        name: docID,
        mutators,
      });

      const defaultUserInfo = randUserInfo();
      const d = await createData(rep, defaultUserInfo);

      Pusher.logToConsole = true;
      var pusher = new Pusher("d9088b47d2371d532c4c", {
        cluster: "us3",
      });
      var channel = pusher.subscribe("default");
      channel.bind("poke", function (data: unknown) {
        rep.pull();
      });

      setData(d);
    })();
  }, []);

  if (!data) {
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
      <Nav data={data} />
      <Designer {...{ data }} />
    </div>
  );
}
