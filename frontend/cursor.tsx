import { Data } from "./data";
import styles from "./cursor.module.css";
import { useEffect, useState } from "react";

const hideCursorDelay = 5000;

interface Position {
  pos: {
    x: number;
    y: number;
  };
  ts: number;
}

export function Cursor({ data, clientID }: { data: Data; clientID: string }) {
  const userInfo = data.useUserInfo(clientID);
  const cursor = data.useCursor(clientID);
  const [lastPosition, setLastPosition] = useState<Position | null>(null);
  const [seenFirstChange, setSeenFirstChange] = useState(false);
  const [, setPoke] = useState({});

  if (cursor) {
    if (lastPosition == null) {
      setLastPosition({ pos: cursor, ts: Date.now() });
    } else if (
      lastPosition.pos.x != cursor.x ||
      lastPosition.pos.y != cursor.y
    ) {
      setLastPosition({ pos: cursor, ts: Date.now() });
      setSeenFirstChange(true);
    }
  }

  let visible = false;
  let elapsed = null;
  let remaining = 0;
  if (seenFirstChange && lastPosition) {
    elapsed = Date.now() - lastPosition.ts;
    remaining = hideCursorDelay - elapsed;
    visible = remaining > 0;
  }

  useEffect(() => {
    if (remaining > 0) {
      console.log(`Cursor ${clientID} - setting timer for ${remaining}ms`);
      const timerID = setTimeout(() => setPoke({}), remaining);
      return () => clearTimeout(timerID);
    }
  });

  console.log(
    `Cursor ${clientID} - elapsed ${elapsed}, remaining: ${remaining}, visible: ${visible}`
  );
  if (!cursor || !userInfo) {
    return null;
  }

  return (
    <div
      className={styles.cursor}
      style={{ left: cursor.x, top: cursor.y, opacity: visible ? 1 : 0 }}
    >
      <div className={styles.pointer} style={{ color: userInfo.color }}>
        ➤
      </div>
      <div
        className={styles.userinfo}
        style={{
          backgroundColor: userInfo.color,
          color: "white",
        }}
      >
        {userInfo.avatar}&nbsp;&nbsp;{userInfo.name}
      </div>
    </div>
  );
}
