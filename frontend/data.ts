import { Replicache } from "replicache";
import type { UserInfo } from "../frontend/client-state";
import { mutators } from "../frontend/mutators";

/**
 * Abstracts Replicache storage (key/value pairs) to entities (Shape).
 */
export type Data = Await<ReturnType<typeof createData>>;
type Await<T> = T extends PromiseLike<infer U> ? U : T;

export async function createData(
  rep: Replicache<typeof mutators>,
  defaultUserInfo: UserInfo
) {
  let clientID = await rep.clientID;

  await rep.mutate.initClientState({
    id: clientID,
    defaultUserInfo,
  });

  return {
    clientID,

    get rep(): Replicache<typeof mutators> {
      return rep;
    },

    ...rep.mutate,
  };
}
