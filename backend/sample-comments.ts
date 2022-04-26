import type { Comment } from "../frontend/issue";
//import { getReactIssues } from "./sample-issues";

export async function getReactComments(): Promise<Comment[]> {
  // const issueIDs = new Set((await getReactIssues()).map((issue) => issue.id));
  // const comments = (await import("./comments-react.js.gz")).default.map(
  //   (reactComment) => ({
  //     id: reactComment.comment_id,
  //     issueID: reactComment.number.toString(),
  //     created: Date.parse(reactComment.created_at),
  //     body: reactComment.body || "",
  //     creator: reactComment.creator_user_login,
  //   })
  // );
  return [];
}
