import { useEffect, useState } from "react";
import { Replicache } from "replicache";
import { M, mutators } from "../../frontend/mutators";
import App from "../../frontend/app";
import { createClient } from "@supabase/supabase-js";
import {
  getIssuesByActiveReverseModifiedIndexDefinition,
  getIssuesByBacklogReverseModifiedIndexDefinition,
  getIssuesByReverseModifiedIndexDefinition,
} from "frontend/issue";

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
      });

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

      await r.createIndex(getIssuesByReverseModifiedIndexDefinition());
      await r.createIndex(getIssuesByActiveReverseModifiedIndexDefinition());
      await r.createIndex(getIssuesByBacklogReverseModifiedIndexDefinition());
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
