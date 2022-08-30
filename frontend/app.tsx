import type { UndoManager } from "@rocicorp/undo";
import classnames from "classnames";
import { generateKeyBetween } from "fractional-indexing";
import { useAtomValue, useSetAtom } from "jotai";
import { minBy, pickBy } from "lodash";
import { useQueryState } from "next-usequerystate";
import { memo, useCallback, useEffect, useState } from "react";
import { HotKeys } from "react-hotkeys";
import type { ReadTransaction, Replicache } from "replicache";
import { useSubscribe } from "replicache-react";
import { getPartialSyncState, PartialSyncState } from "./control";
import {
  Comment,
  COMMENT_KEY_PREFIX,
  Description,
  DESCRIPTION_KEY_PREFIX,
  Issue,
  IssueUpdate,
  IssueUpdateWithID,
  ISSUE_KEY_PREFIX,
  Order,
  orderEnumSchema,
} from "./issue";
import IssueBoard from "./issue-board";
import IssueDetail from "./issue-detail";
import IssueList from "./issue-list";
import LeftMenu from "./left-menu";
import type { M } from "./mutators";
import {
  allIssuesMapAtom,
  issueDiffHandlerAtom,
  Filters,
  filtersAtom,
  commentDiffHandlerAtom,
  descriptionDiffHandlerAtom,
  issueOrderAtom,
} from "./state";
import TopFilter from "./top-filter";

function getFilters(
  view: string | null,
  priorityFilter: string | null,
  statusFilter: string | null
): Filters {
  return new Filters(view, priorityFilter, statusFilter);
}

function getIssueOrder(view: string | null, orderBy: string | null): Order {
  if (view === "board") {
    return Order.KANBAN;
  }
  const parseResult = orderEnumSchema.safeParse(orderBy);
  return parseResult.success ? parseResult.data : Order.MODIFIED;
}

type AppProps = {
  rep: Replicache<M>;
  undoManager: UndoManager;
};

const App = ({ rep, undoManager }: AppProps) => {
  const [view] = useQueryState("view");
  const [priorityFilter] = useQueryState("priorityFilter");
  const [statusFilter] = useQueryState("statusFilter");
  const [orderBy] = useQueryState("orderBy");
  const [detailIssueID, setDetailIssueID] = useQueryState("iss");
  const [menuVisible, setMenuVisible] = useState(false);

  const allIssuesMap = useAtomValue(allIssuesMapAtom);
  const setFilters = useSetAtom(filtersAtom);
  const setOrderBy = useSetAtom(issueOrderAtom);
  const issueDiffHandler = useSetAtom(issueDiffHandlerAtom);
  const descriptionDiffHandler = useSetAtom(descriptionDiffHandlerAtom);
  const commentDiffHandler = useSetAtom(commentDiffHandlerAtom);

  const partialSync = useSubscribe<
    PartialSyncState | "NOT_RECEIVED_FROM_SERVER"
  >(
    rep,
    async (tx: ReadTransaction) => {
      return (await getPartialSyncState(tx)) || "NOT_RECEIVED_FROM_SERVER";
    },
    "NOT_RECEIVED_FROM_SERVER"
  );

  const partialSyncComplete = partialSync === "PARTIAL_SYNC_COMPLETE";
  useEffect(() => {
    console.log("partialSync", partialSync);
    if (!partialSyncComplete) {
      rep.pull();
    }
  }, [rep, partialSync, partialSyncComplete]);

  useEffect(() => {
    rep.experimentalWatch(issueDiffHandler, {
      prefix: ISSUE_KEY_PREFIX,
      initialValuesInFirstDiff: true,
    });
  }, [rep, issueDiffHandler]);

  useEffect(() => {
    rep.experimentalWatch(descriptionDiffHandler, {
      prefix: DESCRIPTION_KEY_PREFIX,
      initialValuesInFirstDiff: true,
    });
  }, [rep, descriptionDiffHandler]);

  useEffect(() => {
    rep.experimentalWatch(commentDiffHandler, {
      prefix: COMMENT_KEY_PREFIX,
      initialValuesInFirstDiff: true,
    });
  }, [rep, commentDiffHandler]);

  useEffect(() => setFilters(getFilters(view, priorityFilter, statusFilter)), [
    view,
    priorityFilter,
    statusFilter,
    setFilters,
  ]);

  useEffect(() => setOrderBy(getIssueOrder(view, orderBy)), [
    view,
    orderBy,
    setOrderBy,
  ]);

  const handleCreateIssue = useCallback(
    async (issue: Omit<Issue, "kanbanOrder">, description: Description) => {
      const minKanbanOrderIssue = minBy(
        [...allIssuesMap.values()],
        (issue) => issue.kanbanOrder
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
    [rep.mutate, allIssuesMap]
  );
  const handleCreateComment = useCallback(
    async (comment: Comment) => {
      await undoManager.add({
        execute: () => rep.mutate.putIssueComment(comment),
        undo: () => rep.mutate.deleteIssueComment(comment),
      });
    },
    [rep.mutate, undoManager]
  );

  const handleUpdateIssues = useCallback(
    async (issueUpdates: Array<IssueUpdate>) => {
      const uChanges: Array<IssueUpdateWithID> = issueUpdates.map<IssueUpdateWithID>(
        (issueUpdate) => {
          const undoChanges = pickBy(
            issueUpdate.issue,
            (_, key) => key in issueUpdate.issueChanges
          );
          return {
            id: issueUpdate.issue.id,
            issueChanges: undoChanges,
            descriptionChange: issueUpdate.descriptionUpdate?.description,
          };
        }
      );
      await undoManager.add({
        execute: () =>
          rep.mutate.updateIssues(
            issueUpdates.map(({ issue, issueChanges, descriptionUpdate }) => {
              return {
                id: issue.id,
                issueChanges,
                descriptionChange: descriptionUpdate?.descriptionChange,
              };
            })
          ),
        undo: () => rep.mutate.updateIssues(uChanges),
      });
    },
    [rep.mutate, undoManager]
  );

  const handleOpenDetail = useCallback(
    async (issue: Issue) => {
      await setDetailIssueID(issue.id, { scroll: false, shallow: true });
    },
    [setDetailIssueID]
  );
  const handleCloseMenu = useCallback(() => setMenuVisible(false), [
    setMenuVisible,
  ]);
  const handleToggleMenu = useCallback(() => setMenuVisible(!menuVisible), [
    setMenuVisible,
    menuVisible,
  ]);

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
  undo: ["ctrl+z", "command+z"],
  redo: ["ctrl+y", "command+shift+z", "ctrl+shift+z"],
};

interface LayoutProps {
  menuVisible: boolean;
  view: string | null;
  detailIssueID: string | null;
  isLoading: boolean;
  onCloseMenu: () => void;
  onToggleMenu: () => void;
  onUpdateIssues: (issueUpdates: IssueUpdate[]) => void;
  onCreateIssue: (
    issue: Omit<Issue, "kanbanOrder">,
    description: Description
  ) => void;
  onCreateComment: (comment: Comment) => void;
  onOpenDetail: (issue: Issue) => void;
}

const RawLayout = ({
  menuVisible,
  view,
  detailIssueID,
  isLoading,
  onCloseMenu,
  onToggleMenu,
  onUpdateIssues,
  onCreateIssue,
  onCreateComment,
  onOpenDetail,
}: LayoutProps) => {
  return (
    <div>
      <div className="flex w-full h-screen overflow-y-hidden">
        <LeftMenu
          menuVisible={menuVisible}
          onCloseMenu={onCloseMenu}
          onCreateIssue={onCreateIssue}
        />
        <div className="flex flex-col flex-grow min-w-0">
          <div
            className={classnames("flex flex-col", {
              hidden: detailIssueID,
            })}
          >
            <TopFilter
              onToggleMenu={onToggleMenu}
              showSortOrderMenu={view !== "board"}
            />
          </div>
          <div className="relative flex flex-1 min-h-0">
            {detailIssueID && (
              <IssueDetail
                onUpdateIssues={onUpdateIssues}
                onAddComment={onCreateComment}
                isLoading={isLoading}
              />
            )}
            <div
              className={classnames("absolute inset-0 flex flex-col", {
                invisible: detailIssueID,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                "pointer-events-none": detailIssueID,
              })}
            >
              {view === "board" ? (
                <IssueBoard
                  onUpdateIssues={onUpdateIssues}
                  onOpenDetail={onOpenDetail}
                />
              ) : (
                <IssueList
                  onUpdateIssues={onUpdateIssues}
                  onOpenDetail={onOpenDetail}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Layout = memo(RawLayout);

export default App;
