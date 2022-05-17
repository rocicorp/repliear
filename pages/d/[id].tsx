import { Replicache } from "replicache";

const f = async () => {
  const rep = new Replicache({
    name: "oops",
    mutators: {},
    pushURL: "",
    pullURL: "",
    licenseKey: "my-key",
  });

  console.log("before");

  await rep.query(async () => {
    console.log(123);
  });
  console.log("after");
};
void f();

export default function Home() {
  return null;
  // const [rep, setRep] = useState<Replicache<M> | null>(null);

  // useEffect(() => {
  //   // disabled eslint await requirement
  //   // eslint-disable-next-line
  //   (async () => {
  //     if (rep) {
  //       return;
  //     }

  //     const [, , spaceID] = location.pathname.split("/");
  //     const r = new Replicache({
  //       pushURL: `/api/replicache-push?spaceID=${spaceID}`,
  //       pullURL: `/api/replicache-pull?spaceID=${spaceID}`,
  //       name: spaceID,
  //       mutators,
  //       pullInterval: 30000,
  //       // To get your own license key run `npx replicache get-license`. (It's free.)
  //       // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  //       licenseKey: process.env.NEXT_PUBLIC_REPLICACHE_LICENSE_KEY!,
  //     });

  //     if (
  //       process.env.NEXT_PUBLIC_PUSHER_KEY &&
  //       process.env.NEXT_PUBLIC_PUSHER_CLUSTER
  //     ) {
  //       Pusher.logToConsole = true;
  //       const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, {
  //         cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
  //       });

  //       const channel = pusher.subscribe("default");
  //       channel.bind("poke", () => {
  //         r.pull();
  //       });
  //     }
  //     setRep(r);
  //   })();
  // }, [rep]);

  // if (!rep) {
  //   return null;
  // }
  // return (
  //   <div className="repliear">
  //     <App rep={rep} />
  //   </div>
  // );
}
