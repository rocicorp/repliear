import useQueryState, {
  identityProcessor,
  QueryStateProcessor,
} from './useQueryState';
import {Order, Priority, Status} from 'shared';

const processOrderBy: QueryStateProcessor<Order> = {
  toString: (value: Order) => value,
  fromString: (value: string | null) => (value ?? 'MODIFIED') as Order,
};

const processStatuFilter: QueryStateProcessor<Status[]> = {
  toString: (value: Status[]) => value.join(','),
  fromString: (value: string | null) =>
    value === null ? null : (value.split(',') as Status[]),
};

const processPriorityFilter: QueryStateProcessor<Priority[]> = {
  toString: (value: Priority[]) => value.join(','),
  fromString: (value: string | null) =>
    value === null ? null : (value.split(',') as Priority[]),
};

export function useOrderByState() {
  return useQueryState('orderBy', processOrderBy);
}

export function useStatusFilterState() {
  return useQueryState('statusFilter', processStatuFilter);
}

export function usePriorityFilterState() {
  return useQueryState('priorityFilter', processPriorityFilter);
}

export function useViewState() {
  return useQueryState('view', identityProcessor);
}

export function useIssueDetailState() {
  return useQueryState('iss', identityProcessor);
}
