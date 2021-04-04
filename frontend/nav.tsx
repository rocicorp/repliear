import styles from "./nav.module.css";
import { Data } from "./data";
import { newID } from "../shared/id";
import { randInt } from "../shared/rand";

const colors = ["red", "blue", "white", "green", "yellow"];

export function Nav({ data }: { data: Data | null }) {
  const userInfo = data?.useUserInfo(data?.clientID);
  console.log({ userInfo });

  const onRectangle = async () => {
    if (!data) {
      return;
    }
    const s = randInt(100, 400);
    await data.createShape({
      id: newID(),
      shape: {
        type: "rect",
        x: randInt(0, 400),
        y: randInt(0, 400),
        width: s,
        height: s,
        rotate: 0, // randInt(0, 359),
        fill: colors[randInt(0, colors.length - 1)],
      },
    });
  };

  return (
    <div className={styles.nav} style={{}}>
      <div
        onClick={() => onRectangle()}
        className={styles.button}
        title="Square"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 18 18"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M1 1h16v16H1V1zm1 1h14v14H2V2z"
            fillRule="evenodd"
            fill="white"
          ></path>
        </svg>
      </div>
      <div
        className={styles.button}
        title="Clear All"
        onClick={() => data?.deleteAllShapes()}
      >
        <svg
          width="18"
          height="18"
          viewBox="1 1 14 14"
          xmlns="http://www.w3.org/2000/svg"
          transform="rotate(45 0 0)"
        >
          <path
            d="M15 8V7H9V1H8v6H2v1h6v6h1V8h6z"
            fillRule="nonzero"
            fillOpacity="1"
            fill="white"
            stroke="none"
          ></path>
        </svg>
      </div>
      {userInfo && (
        <div
          className={styles.user}
          style={{
            backgroundColor: userInfo.color,
          }}
        >
          {userInfo.avatar} {userInfo.name}
        </div>
      )}
    </div>
  );
}
