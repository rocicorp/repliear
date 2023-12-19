import useQueryState, {
  identityProcessor,
  QueryStateProcessor,
} from './useQueryState';
import {Issue, Order, Priority, Status} from 'shared';
import {
  DateQueryArg,
  getCreatedFilter,
  getCreatorFilter,
  getCreators,
  getModifiedFilter,
  getPriorities,
  getPriorityFilter,
  getStatuses,
  getStatusFilter,
  getViewStatuses,
  hasNonViewFilters as doesHaveNonViewFilters,
} from '../filters';
import {useState} from 'react';

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

export function useFilterStates() {
  const [statusFilter] = useStatusFilterState();
  const [priorityFilter] = usePriorityFilterState();
  const [creatorFilter] = useCreatorFilterState();
  const [createdFilter] = useCreatedFilterState();
  const [modifiedFilter] = useModifiedFilterState();

  return {
    statusFilter,
    priorityFilter,
    creatorFilter,
    createdFilter,
    modifiedFilter,
    filtersIdentity: `${statusFilter?.join('')}-${priorityFilter?.join(
      '',
    )}-${creatorFilter?.join('')}-${createdFilter?.join(
      '',
    )}-${modifiedFilter?.join('')}`,
  };
}

export function useFilters() {
  const baseStates = useFilterStates();
  const [prevIdentity, setPrevIdentity] = useState<string | null>(null);
  const [view] = useViewState();
  const [prevView, setPrevView] = useState<string | null>(null);

  const [state, setState] = useState<{
    filters: ((issue: Issue) => boolean)[];
    hasNonViewFilters: boolean;
  }>({
    filters: [],
    hasNonViewFilters: false,
  });

  if (prevIdentity !== baseStates.filtersIdentity || prevView !== view) {
    setPrevIdentity(baseStates.filtersIdentity);
    setPrevView(view);

    const viewStatuses = getViewStatuses(view);
    const statuses = getStatuses(baseStates.statusFilter);
    const statusFilterFn = getStatusFilter(viewStatuses, statuses);
    const filterFns = [
      statusFilterFn,
      getPriorityFilter(getPriorities(baseStates.priorityFilter)),
      getCreatorFilter(getCreators(baseStates.creatorFilter)),
      getCreatedFilter(baseStates.createdFilter),
      getModifiedFilter(baseStates.modifiedFilter),
    ].filter(f => f !== null) as ((issue: Issue) => boolean)[];

    const hasNonViewFilters = !!(
      doesHaveNonViewFilters(viewStatuses, statuses) ||
      filterFns.filter(f => f !== statusFilterFn).length > 0
    );
    setState({filters: filterFns, hasNonViewFilters});
  }

  return state;
}
