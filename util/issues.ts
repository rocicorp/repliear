export const Priority = {
  NO_PRIORITY: "no_priority",
  URGENT: "urgent",
  HIGH: "high",
  LOW: "low",
  MEDIUM: "medium",
};

export const Status = {
  BACKLOG: "backlog",
  TODO: "todo",
  IN_PROGRESS: "in_progress",
  DONE: "done",
  CANCELED: "canceled",
};

export type User = {
  id?: string;
  name?: string;
  avatar?: string;
};
export type Issue = {
  priority: string;
  id: string;
  title: string;
  description: string;
  status: string;
  createdAt?: Date;
  owner?: User;
};

export type Label = {
  id: string;
  name: string;
  color: string;
};

export const DEFAULT_LABLES: Array<Label> = [
  { id: "1", name: "Bug", color: "#eb5757" },
  { id: "2", name: "Feature", color: "#bb87fc" },
  { id: "3", name: "Improvement", color: "#4ea7fc" },
];

export const SampleIssues: Issue[] = [
  {
    priority: Priority.HIGH,
    id: "1",
    title: "Issue 1",
    description: "",
    status: Status.IN_PROGRESS,
  },
  {
    priority: Priority.HIGH,
    id: "2",
    title: "Issue 2",
    description: "",
    status: Status.BACKLOG,
  },
  {
    priority: Priority.HIGH,
    id: "3",
    title: "Issue 3",
    description: "",
    status: Status.IN_PROGRESS,
  },
];

export type IssuesByStatusType = {
  backlog: Issue[] | [];
  todo: Issue[] | [];
  inProgress: Issue[] | [];
  done: Issue[] | [];
  canceled: Issue[] | [];
};

// todo: can do this with a fancy groupBy
export const IssuesByStatus: IssuesByStatusType = {
  backlog: SampleIssues.filter((r) => r.status == Status.BACKLOG) || [],
  todo: SampleIssues.filter((r) => r.status == Status.TODO) || [],
  inProgress: SampleIssues.filter((r) => r.status == Status.IN_PROGRESS) || [],
  done: SampleIssues.filter((r) => r.status == Status.DONE) || [],
  canceled: SampleIssues.filter((r) => r.status == Status.CANCELED) || [],
};
