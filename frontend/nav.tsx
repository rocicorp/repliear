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
        rotate: randInt(0, 359),
        fill: colors[randInt(0, colors.length - 1)],
      },
    });
  };

  return (
    <div className={styles.nav} style={{}}>
      <div className={styles.button} title="Move">
        <svg
          width="18"
          height="18"
          viewBox="0 0 18 18"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M14.872 8.859L3.646 2.072l-.98-.592.231 1.121 2.683 13 .243 1.178.664-1.003 3.038-4.59 5.22-1.417 1.127-.306-1-.604zM4.108 3.52l9.247 5.59-4.274 1.16-.182.05-.104.156-2.479 3.746L4.108 3.52z"
            fillRule="nonzero"
            fillOpacity="1"
            fill="white"
            stroke="none"
          ></path>
        </svg>
      </div>
      <div
        onClick={() => onRectangle()}
        className={styles.button}
        title="Rectangle"
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
      <div className={styles.button} title="Ellipse">
        <svg
          width="18"
          height="18"
          viewBox="0 0 18 18"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M9 17c4.418 0 8-3.582 8-8 0-4.418-3.582-8-8-8-4.418 0-8 3.582-8 8 0 4.418 3.582 8 8 8zm0 1c4.97 0 9-4.03 9-9 0-4.97-4.03-9-9-9-4.97 0-9 4.03-9 9 0 4.97 4.03 9 9 9z"
            fillRule="evenodd"
            fillOpacity="1"
            fill="white"
          ></path>
        </svg>
      </div>
      <div className={styles.button} title="Text">
        <svg
          width="18"
          height="18"
          viewBox="0 0 18 18"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M2 5h1V2h5v14H5v1h7v-1H9V2h5v3h1V1H2v4z"
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
