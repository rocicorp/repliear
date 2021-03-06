import { Data } from "./data";
import styles from "./collaborator.module.css";
import { useEffect, useState } from "react";
import { Rect } from "./rect";

const hideCollaboratorDelay = 5000;

interface Position {
  pos: {
    x: number;
    y: number;
  };
  ts: number;
}

export function Collaborator({
  data,
  clientID,
}: {
  data: Data;
  clientID: string;
}) {
  // The goal here is we want to hide the collaborator if they stop moving for
  // 5s. However this is a little tricky since in order to detect movement we
  // actually need to wait for the second change, since the first one is always
  // going to look like a change, as we are comparing to nothing.
  const clientInfo = data.useClientInfo(clientID);
  const [lastPosition, setLastPosition] = useState<Position | null>(null);
  const [seenFirstChange, setSeenFirstChange] = useState(false);
  const [, setPoke] = useState({});

  let cursor = null;
  let userInfo = null;
  if (clientInfo) {
    cursor = clientInfo.cursor;
    userInfo = clientInfo.userInfo;
  }

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
    remaining = hideCollaboratorDelay - elapsed;
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
  if (!clientInfo || !cursor || !userInfo) {
    return null;
  }

  return (
    <svg className={styles.collaborator} style={{ opacity: visible ? 1 : 0 }}>
      {clientInfo.selectedID && (
        <Rect
          {...{
            data,
            key: `selection-${clientInfo.selectedID}`,
            id: clientInfo.selectedID,
            highlight: true,
            highlightColor: userInfo.color,
          }}
        />
      )}

      <foreignObject
        x={cursor.x}
        y={cursor.y}
        overflow="auto"
        className={styles.cursor}
      >
        <div>
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
            {userInfo.avatar}&nbsp;{userInfo.name}
          </div>
        </div>
      </foreignObject>
    </svg>
  );
}
