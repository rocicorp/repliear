import React, {KeyboardEvent, RefObject, useRef, useState} from 'react';
import {usePopper} from 'react-popper';
import {Filter} from '../issue/issue';
import {useClickOutside} from '../hooks/useClickOutside';
import SignalStrongIcon from '../assets/icons/signal-strong.svg?react';
import TodoIcon from '../assets/icons/circle.svg?react';
import UserIcon from '../assets/icons/avatar.svg?react';
import DateIcon from '../assets/icons/due-date.svg?react';
import {statusOpts} from './priority-menu';
import {statuses} from './status-menu';
import {Priority, Status} from 'shared';
import useId from '@mui/utils/useId';
import {useViewState} from '../hooks/query-state-hooks';
import {getViewStatuses} from '../filters';

type DateCallback = (date: Date) => void;
interface Props {
  onSelectStatus: (filter: Status) => void;
  onSelectPriority: (filter: Priority) => void;
  onCreatorEntered: (creator: string) => void;
  onCreatedAfterEntered: DateCallback;
  onCreatedBeforeEntered: DateCallback;
  onModifiedAfterEntered: DateCallback;
  onModifiedBeforeEntered: DateCallback;
}

const FilterMenu = ({
  onSelectStatus,
  onSelectPriority,
  onCreatorEntered,
  onCreatedAfterEntered,
  onCreatedBeforeEntered,
  onModifiedAfterEntered,
  onModifiedBeforeEntered,
}: Props) => {
  const [filterRef, setFilterRef] = useState<HTMLButtonElement | null>(null);
  const [popperRef, setPopperRef] = useState<HTMLDivElement | null>(null);
  const [filter, setFilter] = useState<Filter | null>(null);
  const [filterDropDownVisible, setFilterDropDownVisible] = useState(false);
  const [view] = useViewState();

  const {styles, attributes, update} = usePopper(filterRef, popperRef, {
    placement: 'bottom-start',
  });

  const ref = useRef<HTMLDivElement>() as RefObject<HTMLDivElement>;

  const handleDropdownClick = async () => {
    await (update && update());
    setFilterDropDownVisible(!filterDropDownVisible);
  };

  useClickOutside(ref, () => {
    if (filterDropDownVisible) {
      setFilter(null);
      setFilterDropDownVisible(false);
    }
  });

  const filterBys = [
    [SignalStrongIcon, Filter.PRIORITY, 'Priority'],
    [TodoIcon, Filter.STATUS, 'Status'],
    [UserIcon, Filter.CREATOR, 'Creator'],
    [DateIcon, Filter.MODIFIED, 'Modified'],
    [DateIcon, Filter.CREATED, 'Created'],
  ] as const;

  //
  const options = (filter: Filter | null) => {
    switch (filter) {
      case Filter.PRIORITY:
        return statusOpts.map(([Icon, label, priority], idx) => {
          return (
            <div
              key={idx}
              className="flex items-center h-8 px-3 text-gray focus:outline-none hover:text-gray-800 hover:bg-gray-300"
              onMouseDown={() => {
                onSelectPriority(priority as Priority);
                setFilter(null);
                setFilterDropDownVisible(false);
              }}
            >
              <Icon className="mr-4" />
              {label}
            </div>
          );
        });

      case Filter.STATUS: {
        const viewStatuses = getViewStatuses(view);
        return statuses
          .filter(s => viewStatuses.size === 0 || viewStatuses.has(s[1]))
          .map(([Icon, status, label], idx) => {
            return (
              <div
                key={idx}
                className="flex items-center h-8 px-3 text-gray focus:outline-none hover:text-gray-800 hover:bg-gray-300"
                onMouseDown={() => {
                  onSelectStatus(status as Status);
                  setFilter(null);
                  setFilterDropDownVisible(false);
                }}
              >
                <Icon className="mr-4" />
                {label}
              </div>
            );
          });
      }
      case Filter.CREATOR:
        return [
          <CreatorInput
            key="1"
            setFilter={setFilter}
            setFilterDropDownVisible={setFilterDropDownVisible}
            onCreatorEntered={onCreatorEntered}
          />,
          <div key="2"></div>,
        ];
      case Filter.CREATED:
        return [
          <DateInput
            key="1"
            setFilter={setFilter}
            setFilterDropDownVisible={setFilterDropDownVisible}
            onDateEntered={onCreatedBeforeEntered}
          >
            Before
          </DateInput>,
          <DateInput
            key="2"
            setFilter={setFilter}
            setFilterDropDownVisible={setFilterDropDownVisible}
            onDateEntered={onCreatedAfterEntered}
          >
            After
          </DateInput>,
          <div key="3"></div>,
        ];
      case Filter.MODIFIED:
        return [
          <DateInput
            key="1"
            setFilter={setFilter}
            setFilterDropDownVisible={setFilterDropDownVisible}
            onDateEntered={onModifiedBeforeEntered}
          >
            Before
          </DateInput>,
          <DateInput
            key="2"
            setFilter={setFilter}
            setFilterDropDownVisible={setFilterDropDownVisible}
            onDateEntered={onModifiedAfterEntered}
          >
            After
          </DateInput>,
          <div key="3"></div>,
        ];
      default:
        return filterBys.map(([Icon, filter, label], idx) => {
          return (
            <div
              key={idx}
              className="flex items-center h-8 px-3 text-gray focus:outline-none hover:text-gray-800 hover:bg-gray-300"
              onMouseDown={() => {
                setFilter(filter as Filter);
              }}
            >
              <Icon className="mr-4" />
              {label}
            </div>
          );
        });
    }
  };

  return (
    <div ref={ref}>
      <button
        className="px-1 py-0.5 ml-3 border border-gray-600 border-dashed rounded text-white hover:text-gray-50 focus:outline-none"
        ref={setFilterRef}
        onMouseDown={handleDropdownClick}
      >
        + Filter
      </button>
      <div
        ref={setPopperRef}
        style={{
          ...styles.popper,
          display: filterDropDownVisible ? '' : 'none',
        }}
        {...attributes.popper}
        className="cursor-default bg-white rounded shadow-modal z-100 w-34"
      >
        <div style={styles.offset}>{options(filter)}</div>
      </div>
    </div>
  );
};

function CreatorInput({
  setFilter,
  setFilterDropDownVisible,
  onCreatorEntered,
}: {
  setFilter: (p: null) => void;
  setFilterDropDownVisible: (p: boolean) => void;
  onCreatorEntered: (p: string) => void;
}) {
  const [creator, setCreator] = useState('');
  function handleKeyPress(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      setFilter(null);
      setFilterDropDownVisible(false);
      onCreatorEntered(creator);
    } else if (e.key === 'Escape') {
      setFilter(null);
      setFilterDropDownVisible(false);
    }
  }
  return (
    <div className="flex items-center h-8 text-gray">
      <input
        autoFocus
        className="box-border h-full w-full outline-none hover:outline-none focus:outline-none hover:text-gray-800 hover:bg-gray-300"
        type="text"
        value={creator}
        onKeyPress={handleKeyPress}
        onChange={e => setCreator(e.target.value)}
      />
    </div>
  );
}

function DateInput({
  setFilter,
  setFilterDropDownVisible,
  onDateEntered,
  children,
}: {
  setFilter: (p: null) => void;
  setFilterDropDownVisible: (p: boolean) => void;
  onDateEntered: (p: Date) => void;
  children: React.ReactNode;
}) {
  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    onDateEntered(new Date(e.target.value));
    setFilter(null);
    setFilterDropDownVisible(false);
  }
  const id = useId() as string;
  return (
    <div className="flex items-center h-8 px-3 text-gray focus:outline-none hover:text-gray-800 hover:bg-gray-300">
      <label htmlFor={id}>{children}</label>
      <input
        type="date"
        id={id}
        style={{
          height: '100%',
          border: 0,
          background: 'inherit',
          outline: 0,
          color: 'transparent',
        }}
        onChange={onChange}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onFocus={e => (e.target as any).showPicker()}
      />
    </div>
  );
}

export default FilterMenu;
