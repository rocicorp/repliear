import {useCallback, useEffect, useReducer} from 'react';
import type {ReadTransaction, Replicache} from 'replicache';
import type {M} from './model/mutators';
import {useState} from 'react';
import {minBy, pickBy} from 'lodash';
import {generateKeyBetween} from 'fractional-indexing';
import type {UndoManager} from '@rocicorp/undo';
import {HotKeys} from 'react-hotkeys';
import {
  useIssueDetailState,
  useOrderByState,
  usePriorityFilterState,
  useStatusFilterState,
  useViewState,
} from './hooks/query-state-hooks';
import {useSubscribe} from 'replicache-react';
import {getPartialSyncState} from './model/control';
import {
  Comment,
  Description,
  Issue,
  IssueUpdate,
  IssueUpdateWithID,
  ISSUE_KEY_PREFIX,
} from 'shared';
import {getFilters, getIssueOrder} from './filters';
import {Layout} from './layout/layout';
import {timedReducer} from './reducer';

type AppProps = {
  rep: Replicache<M>;
  undoManager: UndoManager;
};

const App = ({rep, undoManager}: AppProps) => {
  const [view] = useViewState();
  const [priorityFilter] = usePriorityFilterState();
  const [statusFilter] = useStatusFilterState();
  const [orderBy] = useOrderByState();
  const [detailIssueID, setDetailIssueID] = useIssueDetailState();
  const [menuVisible, setMenuVisible] = useState(false);

  const [state, dispatch] = useReducer(timedReducer, {
    allIssuesMap: new Map(),
    viewIssueCount: 0,
    filteredIssues: [],
    filters: getFilters(view, priorityFilter, statusFilter),
    issueOrder: getIssueOrder(view, orderBy),
  });

  const partialSync = useSubscribe(
    rep,
    async (tx: ReadTransaction) => {
      return (await getPartialSyncState(tx)) || 'NOT_RECEIVED_FROM_SERVER';
    },
    {default: 'NOT_RECEIVED_FROM_SERVER'},
  );
  const partialSyncComplete = partialSync === 'COMPLETE';
  useEffect(() => {
    console.log('partialSync', partialSync);
    if (!partialSyncComplete) {
      void rep.pull();
    }
  }, [rep, partialSync, partialSyncComplete]);

  useEffect(() => {
    const ev = new EventSource(`/api/replicache/poke?channel=poke`);
    ev.onmessage = async () => {
      console.log('Receive poke. Pulling');
      void rep.pull();
    };
    return () => ev.close();
  }, []);

  useEffect(() => {
    return rep.experimentalWatch(
      diff => {
        dispatch({
          type: 'diff',
          diff,
        });
      },
      {prefix: ISSUE_KEY_PREFIX, initialValuesInFirstDiff: true},
    );
  }, [rep]);

  useEffect(() => {
    dispatch({
      type: 'setFilters',
      filters: getFilters(view, priorityFilter, statusFilter),
    });
  }, [view, priorityFilter?.join(), statusFilter?.join()]);

  useEffect(() => {
    dispatch({
      type: 'setIssueOrder',
      issueOrder: getIssueOrder(view, orderBy),
    });
  }, [view, orderBy]);

  const handleCreateIssue = useCallback(
    async (issue: Omit<Issue, 'kanbanOrder'>, description: Description) => {
      const minKanbanOrderIssue = minBy(
        [...state.allIssuesMap.values()],
        issue => issue.kanbanOrder,
      );
      const minKanbanOrder = minKanbanOrderIssue
        ? minKanbanOrderIssue.kanbanOrder
        : null;

      await rep.mutate.putIssue({
        issue: {
          ...issue,
          kanbanOrder: generateKeyBetween(null, minKanbanOrder),
        },
        description,
      });
    },
    [rep.mutate, state.allIssuesMap],
  );
  const handleCreateComment = useCallback(
    async (comment: Comment) => {
      await undoManager.add({
        execute: () => rep.mutate.putIssueComment(comment),
        undo: () => rep.mutate.deleteIssueComment(comment),
      });
    },
    [rep.mutate, undoManager],
  );

  const handleUpdateIssues = useCallback(
    async (issueUpdates: Array<IssueUpdate>) => {
      const uChanges: Array<IssueUpdateWithID> =
        issueUpdates.map<IssueUpdateWithID>(issueUpdate => {
          const undoChanges = pickBy(
            issueUpdate.issue,
            (_, key) => key in issueUpdate.issueChanges,
          );
          const rv: IssueUpdateWithID = {
            id: issueUpdate.issue.id,
            issueChanges: undoChanges,
          };
          const {descriptionUpdate} = issueUpdate;
          if (descriptionUpdate) {
            return {
              ...rv,
              descriptionChange: descriptionUpdate.description,
            };
          }
          return rv;
        });
      await undoManager.add({
        execute: () =>
          rep.mutate.updateIssues(
            issueUpdates.map(({issue, issueChanges, descriptionUpdate}) => {
              const rv: IssueUpdateWithID = {
                id: issue.id,
                issueChanges,
              };
              if (descriptionUpdate) {
                return {
                  ...rv,
                  descriptionChange: descriptionUpdate.description,
                };
              }
              return rv;
            }),
          ),
        undo: () => rep.mutate.updateIssues(uChanges),
      });
    },
    [rep.mutate, undoManager],
  );

  const handleOpenDetail = useCallback(
    async (issue: Issue) => {
      await setDetailIssueID(issue.id);
    },
    [setDetailIssueID],
  );
  const handleCloseMenu = useCallback(
    () => setMenuVisible(false),
    [setMenuVisible],
  );
  const handleToggleMenu = useCallback(
    () => setMenuVisible(!menuVisible),
    [setMenuVisible, menuVisible],
  );

  const handlers = {
    undo: () => undoManager.undo(),
    redo: () => undoManager.redo(),
  };

  return (
    <HotKeys
      {...{
        keyMap,
        handlers,
      }}
    >
      <Layout
        menuVisible={menuVisible}
        view={view}
        detailIssueID={detailIssueID}
        isLoading={!partialSyncComplete}
        state={state}
        rep={rep}
        onCloseMenu={handleCloseMenu}
        onToggleMenu={handleToggleMenu}
        onUpdateIssues={handleUpdateIssues}
        onCreateIssue={handleCreateIssue}
        onCreateComment={handleCreateComment}
        onOpenDetail={handleOpenDetail}
      ></Layout>
    </HotKeys>
  );
};

const keyMap = {
  undo: ['ctrl+z', 'command+z'],
  redo: ['ctrl+y', 'command+shift+z', 'ctrl+shift+z'],
};

export default App;
