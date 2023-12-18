const held = new Set<string>();

/**
 * Acquires a lock for the lifetime of a tab.
 * When the tab is closed, crashes,
 * and presumably put to sleep?, <-- research this one
 * the lock is released.
 *
 * Why this lock thing?
 * The backend `pull` API currently serializes on the client group.
 * If we have two tabs going full blast on sync we get serialization errors very frequently.
 * We could:
 * a. fix the backend
 * b. coordinate sync between tabs
 *
 * Note: tabs can be forked and get new client groups.. so we'd need to update `acquire` to deal with that case.
 *
 * @param name
 * @returns
 */
export function acquire(name: string) {
  const ret: {
    held: boolean;
    onAcquired?: () => void;
  } = {
    held: false,
  };

  if (held.has(name)) {
    ret.held = true;
    return ret;
  }

  const p = new Promise(() => {
    // Do nothing.
  });

  navigator.locks
    .request(
      name,
      // Lock is acquired.
      _lock => {
        held.add(name);
        ret.held = true;
        if (ret.onAcquired) {
          ret.onAcquired();
        }
        return p;
      },
    )
    .catch(e => {
      console.error(e);
    });

  return ret;
}
