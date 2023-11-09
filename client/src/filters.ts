import {isEqual} from 'lodash';
import {Issue, Order, Priority, Status} from 'shared';

export class Filters {
  private readonly _viewStatuses: Set<Status> | undefined;
  private readonly _issuesStatuses: Set<Status> | undefined;
  private readonly _issuesPriorities: Set<Priority> | undefined;
  readonly hasNonViewFilters: boolean;
  constructor(
    view: string | null,
    priorityFilter: Priority[] | null,
    statusFilter: Status[] | null,
  ) {
    this._viewStatuses = undefined;
    switch (view?.toLowerCase()) {
      case 'active':
        this._viewStatuses = new Set(['IN_PROGRESS', 'TODO']);
        break;
      case 'backlog':
        this._viewStatuses = new Set(['BACKLOG']);
        break;
      default:
        this._viewStatuses = undefined;
    }

    this._issuesStatuses = undefined;
    this._issuesPriorities = undefined;
    this.hasNonViewFilters = false;
    if (statusFilter) {
      this._issuesStatuses = new Set<Status>();
      for (const s of statusFilter) {
        if (!this._viewStatuses || this._viewStatuses.has(s)) {
          this.hasNonViewFilters = true;
          this._issuesStatuses.add(s);
        }
      }
    }
    if (!this.hasNonViewFilters) {
      this._issuesStatuses = this._viewStatuses;
    }

    if (priorityFilter) {
      this._issuesPriorities = new Set<Priority>();
      for (const p of priorityFilter) {
        this.hasNonViewFilters = true;
        this._issuesPriorities.add(p);
      }
      if (this._issuesPriorities.size === 0) {
        this._issuesPriorities = undefined;
      }
    }
  }

  viewFilter(issue: Issue): boolean {
    return this._viewStatuses ? this._viewStatuses.has(issue.status) : true;
  }

  issuesFilter(issue: Issue): boolean {
    if (this._issuesStatuses) {
      if (!this._issuesStatuses.has(issue.status)) {
        return false;
      }
    }
    if (this._issuesPriorities) {
      if (!this._issuesPriorities.has(issue.priority)) {
        return false;
      }
    }
    return true;
  }

  equals(other: Filters): boolean {
    return (
      this === other ||
      (isEqual(this._viewStatuses, other._viewStatuses) &&
        isEqual(this._issuesStatuses, other._issuesStatuses) &&
        isEqual(this._issuesPriorities, other._issuesPriorities) &&
        isEqual(this.hasNonViewFilters, other.hasNonViewFilters))
    );
  }
}

export function getFilters(
  view: string | null,
  priorityFilter: Priority[] | null,
  statusFilter: Status[] | null,
): Filters {
  return new Filters(view, priorityFilter, statusFilter);
}

export function getIssueOrder(
  view: string | null,
  orderBy: Order | null,
): Order {
  if (view === 'board') {
    return 'KANBAN';
  }
  return orderBy ?? 'MODIFIED';
}
