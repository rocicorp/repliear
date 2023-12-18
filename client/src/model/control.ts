import {ReadTransaction} from 'replicache';
import {PartialSyncState, PARTIAL_SYNC_STATE_KEY} from 'shared';

export async function getPartialSyncState(
  tx: ReadTransaction,
): Promise<PartialSyncState | undefined> {
  const val = await tx.get(PARTIAL_SYNC_STATE_KEY);
  if (val === undefined) {
    return undefined;
  }
  return val as PartialSyncState;
}
