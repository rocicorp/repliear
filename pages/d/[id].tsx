import { useEffect, useState } from "react";
import { ReadonlyJSONValue, Replicache, TEST_LICENSE_KEY } from "replicache";
import { M, mutators } from "../../frontend/mutators";
import App from "../../frontend/app";
import { createClient } from "@supabase/supabase-js";

export default function Home() {
  const [rep, setRep] = useState<Replicache<M> | null>(null);

  // TODO: Think through Replicache + SSR.
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
        licenseKey: TEST_LICENSE_KEY,
      });
      const unsub = r.subscribe(
        (tx) => {
          return tx.get("control/partialSync");
        },
        {
          onData: (result: ReadonlyJSONValue | undefined) => {
            console.log("partialSync", result);
            if (
              (result === undefined ||
                (result as { endKey?: string }).endKey) !== undefined
            ) {
              r.pull();
            } else {
              unsub();
            }
          },
        }
      );

      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_KEY!
      );
      supabase
        .from(`space:id=eq.${spaceID}`)
        .on("*", () => {
          r.pull();
        })
        .subscribe();
      setRep(r);
    })();
  }, []);

  if (!rep) {
    return null;
  }
  return (
    <div className="repliear">
      <App rep={rep} />
    </div>
  );
}
