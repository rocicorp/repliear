import { useEffect, useState } from "react";
import Replicache from "replicache";
import { Data } from "../frontend/data";
import { Designer } from "../frontend/designer";
import { Nav } from "../frontend/nav";
import Pusher from "pusher-js";

export default function Home() {
  const [data, setData] = useState<Data | null>(null);

  // TODO: Think through Replicache + SSR.
  useEffect(() => {
    if (data) {
      return;
    }

    const isProd = location.host.indexOf(".vercel.app") > -1;
    const rep = new Replicache({
      batchURL: "/api/replicache-push",
      clientViewURL: "/api/replicache-pull",
      diffServerURL: isProd
        ? "https://serve.replicache.dev/pull"
        : "http://localhost:7001/pull",
      diffServerAuth: isProd ? "1000000" : "sandbox",
      // TODO: Shouldn't have to manually load wasm
      wasmModule: isProd ? "/replicache.wasm" : "/replicache.dev.wasm",
      syncInterval: null,
      useMemstore: true,
    });
    rep.sync();

    Pusher.logToConsole = true;
    var pusher = new Pusher("d9088b47d2371d532c4c", {
      cluster: "us3",
    });
    var channel = pusher.subscribe("default");
    channel.bind("poke", function (data: unknown) {
      rep.sync();
    });

    setData(new Data(rep));
  });

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
      {data && <Designer {...{ data }} />}
    </div>
  );
}
