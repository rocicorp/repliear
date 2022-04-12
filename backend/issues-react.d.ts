declare module "*issues-react.js.gz" {
  const gitHubIssues: {
    id: number;
    title: string;
    body: string | null;
    state: "open" | "closed";
    // eslint-disable-next-line @typescript-eslint/naming-convention
    updated_at: string;
  }[];
  export default gitHubIssues;
}
