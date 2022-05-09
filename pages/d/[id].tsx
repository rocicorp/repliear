import { useEffect, useState } from "react";
import { ReadonlyJSONValue, Replicache } from "replicache";
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
        // To get your own license key run `npx replicache get-license`. (It's free.)
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        licenseKey: process.env.NEXT_PUBLIC_REPLICACHE_LICENSE_KEY!,
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
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
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
