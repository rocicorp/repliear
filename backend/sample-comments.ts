import type { Comment } from "../frontend/issue";

export async function getReactComments(): Promise<Comment[]> {
  const comments = (await import("./comments-react.js.gz")).default.map(
    (reactComment) => ({
      id: reactComment.comment_id,
      issueID: reactComment.number.toString(),
      created: Date.parse(reactComment.created_at),
      body: reactComment.body || "",
      creator: reactComment.creator_user_login,
    })
  );
  return comments;
}
