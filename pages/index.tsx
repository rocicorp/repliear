import { transact } from "../backend/pg";
import { createDatabase, getUnusedSpace } from "../backend/data";
import { getReactIssues } from "../backend/sample-issues";
import { getReactComments } from "../backend/sample-comments";

function Page() {
  return "";
}

export async function getServerSideProps() {
  const spaceID = await transact(async (executor) => {
    await createDatabase(executor);
    return getUnusedSpace(executor, getReactIssues, getReactComments);
  });
  return {
    redirect: {
      destination: `/d/${spaceID}`,
      permanent: false,
    },
  };
}

export default Page;
