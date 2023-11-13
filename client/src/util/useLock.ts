import {useEffect, useState} from 'react';
import {acquire} from './sync-lock';

/**
 * Acquires a web lock for the duration of the tab.
 * Only runs the effect if the lock is held.
 *
 * Useful for ensuring only a single table can perform a specific effect.
 *
 * @param lockName
 * @param fn
 * @param deps
 */
export function useExclusiveEffect(
  lockName: string,
  fn: () => void,
  deps: unknown[],
) {
  const [syncLockHeld, setSyncLockHeld] = useState(false);
  useEffect(() => {
    const lock = acquire(lockName);
    setSyncLockHeld(lock.held);
    lock.onAcquired = () => {
      setSyncLockHeld(true);
    };
    if (syncLockHeld) {
      fn();
    }
  }, [syncLockHeld, ...deps]);
}
