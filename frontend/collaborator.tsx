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
  const clientInfo = data.useClientInfo(clientID);
  const [lastPos, setLastPos] = useState<Position | null>(null);
  const [, setPoke] = useState({});

  let curPos = null;
  let userInfo = null;
  if (clientInfo) {
    curPos = clientInfo.cursor;
    userInfo = clientInfo.userInfo;
  }

  let elapsed = 0;
  let remaining = 0;
  let visible = false;

  if (curPos) {
    if (!lastPos) {
      setLastPos({ pos: curPos, ts: Date.now() });
    } else {
      elapsed = Date.now() - lastPos.ts;
      remaining = hideCollaboratorDelay - elapsed;
      visible = remaining > 0;
      if (lastPos.pos.x != curPos.x || lastPos.pos.y != curPos.y) {
        setLastPos({ pos: curPos, ts: Date.now() });
      }
    }
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
  if (!clientInfo || !curPos || !userInfo) {
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
        x={curPos.x}
        y={curPos.y}
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
