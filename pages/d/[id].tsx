import { useEffect, useState } from "react";
import { Replicache } from "replicache";
import { M, mutators } from "../../frontend/mutators";
import App from "../../frontend/app";
import { createClient } from "@supabase/supabase-js";
import { getIssues, SampleIssues } from "frontend/issue";
import { useRouter } from "next/router";

export default function Home() {
  const router = useRouter();
  const [rep, setRep] = useState<Replicache<M> | null>(null);

  const { spaceIDParam } = router.query;
  const spaceID =
    typeof spaceIDParam === "string" ? spaceIDParam : spaceIDParam[0];
  // TODO: Think through Replicache + SSR.
  useEffect(() => {
    // disabled eslint await requirement
    // eslint-disable-next-line
    (async () => {
      if (rep) {
        return;
      }
      const r = new Replicache({
        pushURL: `/api/replicache-push?spaceID=${spaceID}`,
        pullURL: `/api/replicache-pull?spaceID=${spaceID}`,
        name: spaceID,
        mutators,
        pullInterval: 30000,
      });

      const unsub = r.subscribe(
        async (tx) => {
          return {
            initialized: (await tx.get("initialized")) || false,
            issues: await getIssues(tx, 1),
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
      <App rep={rep} spaceID={spaceID} />
    </div>
  );
}
