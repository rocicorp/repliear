import useQueryState, {
  identityProcessor,
  QueryStateProcessor,
} from './useQueryState';
import {Order, Priority, Status} from 'shared';
import {DateQueryArg} from '../filters';

const processOrderBy: QueryStateProcessor<Order> = {
  toString: (value: Order) => value,
  fromString: (value: string | null) => (value ?? 'MODIFIED') as Order,
};

function makeStringSetProcessor<T extends string>(): QueryStateProcessor<T[]> {
  return {
    toString: (value: T[]) => value.join(','),
    fromString: (value: string | null) =>
      value === null ? null : (value.split(',') as T[]),
  };
}

export function useOrderByState() {
  return useQueryState('orderBy', processOrderBy);
}

export function useStatusFilterState() {
  return useQueryState('statusFilter', makeStringSetProcessor<Status>());
}

export function usePriorityFilterState() {
  return useQueryState('priorityFilter', makeStringSetProcessor<Priority>());
}

export function useViewState() {
  return useQueryState('view', identityProcessor);
}

export function useIssueDetailState() {
  return useQueryState('iss', identityProcessor);
}

export function useCreatorFilterState() {
  return useQueryState('creatorFilter', makeStringSetProcessor<string>());
}

export function useCreatedFilterState() {
  return useQueryState('createdFilter', makeStringSetProcessor<DateQueryArg>());
}

export function useModifiedFilterState() {
  return useQueryState(
    'modifiedFilter',
    makeStringSetProcessor<DateQueryArg>(),
  );
}
