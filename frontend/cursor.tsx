import { Data } from "./data";
import styles from "./cursor.module.css";

export function Cursor({ data, clientID }: { data: Data; clientID: string }) {
  const userInfo = data.useUserInfo(clientID);
  const cursor = data.useCursor(clientID);
  if (!userInfo || !cursor) {
    return null;
  }
  return (
    <div className={styles.cursor} style={{ left: cursor.x, top: cursor.y }}>
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
