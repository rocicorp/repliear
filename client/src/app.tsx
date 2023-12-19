import {useCallback, useEffect} from 'react';
import type {
  ReadTransaction,
  Replicache,
  ExperimentalDiff as Diff,
} from 'replicache';
import type {M} from './model/mutators';
import {useState} from 'react';
import {pickBy} from 'lodash';
import {generateKeyBetween} from 'fractional-indexing';
import type {UndoManager} from '@rocicorp/undo';
import {HotKeys} from 'react-hotkeys';
import {
  useFilters,
  useIssueDetailState,
  useOrderByState,
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
import {Layout} from './layout/layout';
import {db} from './materialite/db';
import {useQuery} from '@vlcn.io/materialite-react';
import {issueFromKeyAndValue} from './issue/issue';
import {getIssueOrder, getViewFilter, getViewStatuses} from './filters';

type AppProps = {
  rep: Replicache<M>;
  undoManager: UndoManager;
};

function onNewDiff(diff: Diff) {
  if (diff.length === 0) {
    return;
  }

  const start = performance.now();
  db.tx(() => {
    for (const diffOp of diff) {
      if ('oldValue' in diffOp) {
        const issueFromEvent = issueFromKeyAndValue(
          diffOp.key as string,
          diffOp.oldValue,
        );
        const oldIssue = db.issues.get(issueFromEvent.id);
        if (oldIssue) {
          db.issues.delete(oldIssue);
        } else {
          console.log('NO OLD ISSUE?!', diffOp.key);
        }
      }
      if ('newValue' in diffOp) {
        db.issues.add(
          issueFromKeyAndValue(diffOp.key as string, diffOp.newValue),
        );
      }
    }
  });

  const duration = performance.now() - start;
  console.log(`Diff duration: ${duration}ms`);
}

const App = ({rep, undoManager}: AppProps) => {
  const [view] = useViewState();
  const [orderBy] = useOrderByState();
  const [detailIssueID, setDetailIssueID] = useIssueDetailState();
  const [menuVisible, setMenuVisible] = useState(false);
  const {filters, hasNonViewFilters} = useFilters();

  const issueOrder = getIssueOrder(view, orderBy);

  const [, filterdIssues] = useQuery(() => {
    const start = performance.now();
    const source = db.issues.getSortedSource(issueOrder);

    let {stream} = source;
    for (const filter of filters) {
      stream = stream.filter(filter);
    }

    const ret = stream.materialize(source.comparator);
    console.log(`Filter update duration: ${performance.now() - start}ms`);
    return ret;
  }, [issueOrder, filters]);

  const [, viewIssueCount] = useQuery(() => {
    const viewStatuses = getViewStatuses(view);
    const viewFilterFn = getViewFilter(viewStatuses);

    const source = db.issues.getSortedSource(issueOrder);
    return source.stream.filter(viewFilterFn).size().materializeValue(0);
  }, [view]);

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
    return rep.experimentalWatch(onNewDiff, {
      prefix: ISSUE_KEY_PREFIX,
      initialValuesInFirstDiff: true,
    });
  }, [rep]);

  const handleCreateIssue = useCallback(
    async (issue: Omit<Issue, 'kanbanOrder'>, description: Description) => {
      const minKanbanOrderIssue = db.issues
        .getSortedSource('KANBAN')
        .value.getMin();
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
    [rep.mutate],
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
        viewIssueCount={viewIssueCount || 0}
        filteredIssues={filterdIssues}
        rep={rep}
        hasNonViewFilters={hasNonViewFilters}
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
