declare module "*comments-react.js.gz" {
  const gitHubComments: {
    number: number;
    // eslint-disable-next-line @typescript-eslint/naming-convention
    comment_id: string;
    body: string | null;
    // eslint-disable-next-line @typescript-eslint/naming-convention
    updated_at: string;
    // eslint-disable-next-line @typescript-eslint/naming-convention
    created_at: string;
  }[];
  export default gitHubComments;
}
