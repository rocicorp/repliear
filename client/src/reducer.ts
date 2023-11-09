import {Issue, Order} from 'shared';
import {
  issueFromKeyAndValue,
  priorityOrderValues,
  reverseTimestampSortKey,
  statusOrderValues,
} from './issue/issue';
import type {ExperimentalDiff as Diff, ReadonlyJSONValue} from 'replicache';
import {Filters} from './filters';
import {partial, sortBy, sortedIndexBy} from 'lodash';

export type State = {
  allIssuesMap: Map<string, Issue>;
  viewIssueCount: number;
  filteredIssues: Issue[];
  filters: Filters;
  issueOrder: Order;
};

function getOrderValue(issueOrder: Order, issue: Issue): string {
  let orderValue: string;
  switch (issueOrder) {
    case 'CREATED':
      orderValue = reverseTimestampSortKey(issue.created, issue.id);
      break;
    case 'MODIFIED':
      orderValue = reverseTimestampSortKey(issue.modified, issue.id);
      break;
    case 'STATUS':
      orderValue =
        statusOrderValues[issue.status] +
        '-' +
        reverseTimestampSortKey(issue.modified, issue.id);
      break;
    case 'PRIORITY':
      orderValue =
        priorityOrderValues[issue.priority] +
        '-' +
        reverseTimestampSortKey(issue.modified, issue.id);
      break;
    case 'KANBAN':
      orderValue = issue.kanbanOrder + '-' + issue.id;
      break;
  }
  return orderValue;
}

export function timedReducer(
  state: State,
  action:
    | {
        type: 'diff';
        diff: Diff;
      }
    | {
        type: 'setFilters';
        filters: Filters;
      }
    | {
        type: 'setIssueOrder';
        issueOrder: Order;
      },
): State {
  const start = performance.now();
  const result = reducer(state, action);
  console.log(`Reducer took ${performance.now() - start}ms`, action);
  return result;
}

export function reducer(
  state: State,
  action:
    | {
        type: 'diff';
        diff: Diff;
      }
    | {
        type: 'setFilters';
        filters: Filters;
      }
    | {
        type: 'setIssueOrder';
        issueOrder: Order;
      },
): State {
  const filters = action.type === 'setFilters' ? action.filters : state.filters;
  const issueOrder =
    action.type === 'setIssueOrder' ? action.issueOrder : state.issueOrder;
  const orderIteratee = partial(getOrderValue, issueOrder);
  function filterAndSort(issues: Issue[]): Issue[] {
    return sortBy(
      issues.filter(issue => filters.issuesFilter(issue)),
      orderIteratee,
    );
  }
  function countViewIssues(issues: Issue[]): number {
    let count = 0;
    for (const issue of issues) {
      if (filters.viewFilter(issue)) {
        count++;
      }
    }
    return count;
  }

  switch (action.type) {
    case 'diff': {
      return diffReducer(state, action.diff);
    }
    case 'setFilters': {
      if (action.filters.equals(state.filters)) {
        return state;
      }
      const allIssues = [...state.allIssuesMap.values()];
      return {
        ...state,
        viewIssueCount: countViewIssues(allIssues),
        filters: action.filters,
        filteredIssues: filterAndSort(allIssues),
      };
    }
    case 'setIssueOrder': {
      if (action.issueOrder === state.issueOrder) {
        return state;
      }
      return {
        ...state,
        filteredIssues: sortBy(state.filteredIssues, orderIteratee),
        issueOrder: action.issueOrder,
      };
    }
  }

  return state;
}

function diffReducer(state: State, diff: Diff): State {
  if (diff.length === 0) {
    return state;
  }
  const newAllIssuesMap = new Map(state.allIssuesMap);
  let newViewIssueCount = state.viewIssueCount;
  const newFilteredIssues = [...state.filteredIssues];
  const orderIteratee = partial(getOrderValue, state.issueOrder);

  function add(key: string, newValue: ReadonlyJSONValue) {
    const newIssue = issueFromKeyAndValue(key, newValue);
    newAllIssuesMap.set(key, newIssue);
    if (state.filters.viewFilter(newIssue)) {
      newViewIssueCount++;
    }
    if (state.filters.issuesFilter(newIssue)) {
      newFilteredIssues.splice(
        sortedIndexBy(newFilteredIssues, newIssue, orderIteratee),
        0,
        newIssue,
      );
    }
  }
  function del(key: string, oldValue: ReadonlyJSONValue) {
    const oldIssue = issueFromKeyAndValue(key, oldValue);
    const index = sortedIndexBy(newFilteredIssues, oldIssue, orderIteratee);
    newAllIssuesMap.delete(key);
    if (state.filters.viewFilter(oldIssue)) {
      newViewIssueCount--;
    }
    if (newFilteredIssues[index]?.id === oldIssue.id) {
      newFilteredIssues.splice(index, 1);
    }
  }
  for (const diffOp of diff) {
    switch (diffOp.op) {
      case 'add': {
        add(diffOp.key as string, diffOp.newValue);
        break;
      }
      case 'del': {
        del(diffOp.key as string, diffOp.oldValue);
        break;
      }
      case 'change': {
        del(diffOp.key as string, diffOp.oldValue);
        add(diffOp.key as string, diffOp.newValue);
        break;
      }
    }
  }
  return {
    ...state,
    allIssuesMap: newAllIssuesMap,
    viewIssueCount: newViewIssueCount,
    filteredIssues: newFilteredIssues,
  };
}
