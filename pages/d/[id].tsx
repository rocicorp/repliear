import { useEffect, useState } from "react";
import { Replicache } from "replicache";
import { M, mutators } from "../../frontend/mutators";
import App from "../../frontend/app";
import { createClient } from "@supabase/supabase-js";
import { getAllIssues, SampleIssues } from "frontend/issue";

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
      });

      const unsub = r.subscribe(
        async (tx) => {
          return {
            initialized: (await tx.get("initialized")) || false,
            issues: await getAllIssues(tx),
          };
        },
        {
          onData: (data) => {
            if (data.initialized) {
              unsub();
              if (data.issues.length === 0) {
                for (const i of SampleIssues) {
                  void r.mutate.putIssue(i);
                }
              }
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
