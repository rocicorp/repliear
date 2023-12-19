import {PersistentTreeView} from '@vlcn.io/materialite';
import classNames from 'classnames';
import {memo} from 'react';
import {Replicache} from 'replicache';
import {Comment, Description, Issue, IssueUpdate} from 'shared';
import IssueBoard from '../issue/issue-board';
import IssueDetail from '../issue/issue-detail';
import IssueList from '../issue/issue-list';
import {M} from '../model/mutators';
import LeftMenu from './left-menu';
import TopFilter from './top-filter';

function getTitle(view: string | null) {
  switch (view?.toLowerCase()) {
    case 'active':
      return 'Active issues';
    case 'backlog':
      return 'Backlog issues';
    case 'board':
      return 'Board';
    default:
      return 'All issues';
  }
}

export interface LayoutProps {
  menuVisible: boolean;
  view: string | null;
  detailIssueID: string | null;
  isLoading: boolean;
  viewIssueCount: number;
  hasNonViewFilters: boolean;
  filteredIssues: PersistentTreeView<Issue>['value'];
  rep: Replicache<M>;
  onCloseMenu: () => void;
  onToggleMenu: () => void;
  onUpdateIssues: (issueUpdates: IssueUpdate[]) => void;
  onCreateIssue: (
    issue: Omit<Issue, 'kanbanOrder'>,
    description: Description,
  ) => void;
  onCreateComment: (comment: Comment) => void;
  onOpenDetail: (issue: Issue) => void;
}

const RawLayout = ({
  menuVisible,
  view,
  detailIssueID,
  isLoading,
  viewIssueCount,
  filteredIssues,
  hasNonViewFilters,
  rep,
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
            className={classNames('flex flex-col', {
              hidden: detailIssueID,
            })}
          >
            <TopFilter
              onToggleMenu={onToggleMenu}
              title={getTitle(view)}
              filteredIssuesCount={
                hasNonViewFilters ? filteredIssues.size : undefined
              }
              issuesCount={viewIssueCount}
              showSortOrderMenu={view !== 'board'}
            />
          </div>
          <div className="relative flex flex-1 min-h-0">
            {detailIssueID && (
              <IssueDetail
                issues={filteredIssues}
                rep={rep}
                onUpdateIssues={onUpdateIssues}
                onAddComment={onCreateComment}
                isLoading={isLoading}
              />
            )}
            <div
              className={classNames('absolute inset-0 flex flex-col', {
                'invisible': detailIssueID,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'pointer-events-none': detailIssueID,
              })}
            >
              {view === 'board' ? (
                <IssueBoard
                  issues={filteredIssues}
                  onUpdateIssues={onUpdateIssues}
                  onOpenDetail={onOpenDetail}
                />
              ) : (
                <IssueList
                  issues={filteredIssues}
                  onUpdateIssues={onUpdateIssues}
                  onOpenDetail={onOpenDetail}
                  view={view}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const Layout = memo(RawLayout);
