import { newID } from "../shared/id";

function Page() {
  return "";
}

export function getServerSideProps() {
  return {
    redirect: {
      destination: `/d/${newID()}`,
      permanent: false,
    },
  };
}

export default Page;
