declare module "issues-react.json.gz" {
  const gitHubIssues: {
    id: number;
    title: string;
    body: string;
    state: "open" | "closed";
    // eslint-disable-next-line @typescript-eslint/naming-convention
    updated_at: string;
  }[];
  export default gitHubIssues;
}
