import {useCallback, useEffect, useState} from 'react';
import CloseIcon from '../assets/icons/close.svg?react';
import ArrowIcon from '../assets/icons/arrow.svg?react';

import DefaultAvatarIcon from '../assets/icons/avatar.svg?react';
import EditIcon from '@mui/icons-material/Edit';
import PriorityMenu from '../widgets/priority-menu';
import {getIssueComments} from './issue';
import StatusMenu from '../widgets/status-menu';

import type {Replicache} from 'replicache';
import type {M} from '../model/mutators';
import {useSubscribe} from 'replicache-react';
import {Remark} from 'react-remark';
import {nanoid} from 'nanoid';
import {timeAgo} from '../util/date';
import {useKeyPressed} from '../hooks/useKeyPressed';
import {sortBy} from 'lodash';
import {useIssueDetailState} from '../hooks/query-state-hooks';
import {
  Comment,
  getDescription,
  getIssue,
  Issue,
  IssueUpdate,
  Priority,
  Status,
} from 'shared';
import {PersistentTreeView} from '@vlcn.io/materialite';

interface Props {
  onUpdateIssues: (issueUpdates: IssueUpdate[]) => void;
  onAddComment: (comment: Comment) => void;
  issues: PersistentTreeView<Issue>['value'];
  isLoading: boolean;
  rep: Replicache<M>;
}

const CommentsList = (comments: Comment[], isLoading: boolean) => {
  const elements = sortBy(comments, comment => comment.created).map(comment => (
    <div
      key={comment.id}
      className=" max-w-[85vw] mx-3 bg-gray-850 mt-0 mb-5 border-transparent rounded py-3 px-3 relative whitespace-pre-wrap overflow-auto"
    >
      <div className="h-6 mb-1 -mt-px relative">
        <DefaultAvatarIcon className="w-4.5 h-4.5 rounded-full overflow-hidden flex-shrink-0 float-left mr-2" />
        {comment.creator} {timeAgo(comment.created)}
      </div>
      <div className="block flex-1 whitespace-pre-wrap">
        <Remark>{comment.body}</Remark>
      </div>
    </div>
  ));
  if (isLoading) {
    elements.push(
      <div
        key="loading"
        className=" max-w-[85vw] mx-3 bg-gray-400 mt-0 mb-5 border-transparent rounded py-3 px-3 relative whitespace-pre-wrap overflow-auto"
      >
        Loading...
      </div>,
    );
  }
  return elements;
};

export default function IssueDetail({
  rep,
  onUpdateIssues,
  onAddComment,
  issues,
  isLoading,
}: Props) {
  const [detailIssueID, setDetailIssueID] = useIssueDetailState();

  const [editMode, setEditMode] = useState(false);

  const [currentIssueIdx, setCurrentIssueIdx] = useState<number>(-1);

  const [commentText, setCommentText] = useState('');
  const [titleText, setTitleText] = useState('');
  const [descriptionText, setDescriptionText] = useState('');

  useEffect(() => {
    if (detailIssueID) {
      const index = issues.findIndex(
        (issue: Issue) => issue.id === detailIssueID,
      );
      setCurrentIssueIdx(index);
    }
  }, [issues, detailIssueID]);

  const issue = useSubscribe(
    rep,
    async tx => {
      if (detailIssueID) {
        return (await getIssue(tx, detailIssueID)) || null;
      }
      return null;
    },
    {default: null, dependencies: [detailIssueID]},
  );
  const description = useSubscribe(
    rep,
    async tx => {
      if (detailIssueID) {
        return (await getDescription(tx, detailIssueID)) || null;
      }
      return null;
    },
    {
      default: null,
      dependencies: [detailIssueID],
    },
  );

  const comments = useSubscribe(
    rep,
    async tx => {
      if (detailIssueID) {
        return (await getIssueComments(tx, detailIssueID)) || [];
      }
      return [];
    },
    {
      default: [],
      dependencies: [detailIssueID],
    },
  );

  const handleClose = useCallback(async () => {
    await setDetailIssueID(null);
  }, [setDetailIssueID]);

  const handleChangePriority = useCallback(
    (priority: Priority) => {
      issue && onUpdateIssues([{issue, issueChanges: {priority}}]);
    },
    [onUpdateIssues, issue],
  );

  const handleChangeStatus = useCallback(
    (status: Status) => {
      issue && onUpdateIssues([{issue, issueChanges: {status}}]);
    },
    [onUpdateIssues, issue],
  );

  const handleAddComment = useCallback(() => {
    if (commentText !== '') {
      onAddComment({
        id: `${issue?.id as string}/${nanoid()}`,
        issueID: issue?.id as string,
        created: Date.now(),
        creator: 'Me',
        body: commentText,
      });
      setCommentText('');
    }
  }, [onAddComment, commentText, issue]);

  const handleFwdPrev = useCallback(
    async (direction: 'prev' | 'fwd') => {
      if (currentIssueIdx === undefined) {
        return;
      }
      let newIss = undefined;
      if (direction === 'prev') {
        if (currentIssueIdx === 0) {
          return;
        }
        newIss = issues.at(currentIssueIdx - 1).id;
      } else {
        if (currentIssueIdx === issues.size - 1) {
          return;
        }
        newIss = issues.at(currentIssueIdx + 1).id;
      }

      await setDetailIssueID(newIss);
    },
    [currentIssueIdx, issues, setDetailIssueID],
  );

  const handleFwd = useCallback(async () => {
    await handleFwdPrev('fwd');
  }, [handleFwdPrev]);

  const handlePrev = useCallback(async () => {
    await handleFwdPrev('prev');
  }, [handleFwdPrev]);

  useKeyPressed('j', handleFwd);
  useKeyPressed('k', handlePrev);

  const handleEdit = () => {
    setTitleText(issue?.title || '');
    setDescriptionText(description?.body || '');
    setEditMode(true);
  };

  const handleCancel = () => {
    setEditMode(false);
  };

  const handleSave = () => {
    if (issue) {
      const descriptionUpdate =
        descriptionText !== description?.body
          ? {
              description: description?.body || '',
              descriptionChange: descriptionText,
            }
          : undefined;

      onUpdateIssues([
        {
          issue,
          issueChanges:
            titleText !== issue.title
              ? {
                  title: titleText,
                }
              : {},
          descriptionUpdate,
        },
      ]);
    }
    setEditMode(false);
  };

  return (
    <div className="flex flex-col flex-grow m-3 rounded-md shadow-mdw-7xl border-gray-850 border min-h-0 min-w-0">
      <div className="flex bg-gray-850 border border-gray-700 justify-around">
        <div className="flex-1 p-2">
          <div className="flex flex-row flex-initial ml-3">
            <div
              className="inline-flex items-center justify-center h-6 w-6 rounded hover:bg-gray-400  cursor-pointer"
              onMouseDown={handleClose}
            >
              <CloseIcon className="w-4" />
            </div>
            {currentIssueIdx >= 0 && (
              <>
                <div className="flex flex-row flex-initial select-none cursor-pointer">
                  <button
                    className="h-6 px-2 rounded border-solid border inline-flex items-center justify-center flex-shrink-0 font-medium m-0 select-none whitespace-no-wrap ml-2  hover:bg-gray-400 disabled:opacity-25"
                    type="button"
                    onMouseDown={() => handleFwdPrev('prev')}
                    disabled={currentIssueIdx === 0}
                  >
                    <ArrowIcon style={{transform: 'rotate(180deg)'}} />
                  </button>
                </div>
                <div
                  role="button"
                  className="flex flex-row flex-initial select-none cursor-pointer"
                >
                  <button
                    className="h-6 px-2 rounded border-solid border inline-flex items-center justify-center flex-shrink-0 font-medium m-0 select-none whitespace-no-wrap ml-2  hover:bg-gray-400 disabled:opacity-50"
                    type="button"
                    onMouseDown={() => handleFwdPrev('fwd')}
                    disabled={currentIssueIdx === issues.length - 1}
                  >
                    <ArrowIcon />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex flex-1 p-2 overflow-hidden">
        <div className="flex flex-col flex-[3_0_0] items-center md:p-3 border-gray-700 md:border-r min-h-0 min-w-0 overflow-auto">
          <div className="flex flex-col w-full lg:max-w-4xl max-w-[90vw]">
            <div className="flex border-solid border-b lg:px-5 justify-between px-2">
              <div className="flex visible md:invisible">
                <StatusMenu
                  onSelect={handleChangeStatus}
                  status={issue?.status || 'BACKLOG'}
                  labelVisible={true}
                />
                <PriorityMenu
                  onSelect={handleChangePriority}
                  labelVisible={true}
                  priority={issue?.priority || 'NONE'}
                />
              </div>
              {editMode ? (
                <div className="text-sm flex mb-1">
                  <button
                    className="px-2 ml-2 rounded hover:bg-indigo-700 focus:outline-none bg-gray-850 text-white"
                    onMouseDown={handleSave}
                  >
                    Save
                  </button>
                  <button
                    className="px-2 ml-2 rounded hover:bg-indigo-700 focus:outline-none bg-gray-700 text-white"
                    onMouseDown={handleCancel}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="text-sm">
                  <EditIcon
                    className="!w-4 cursor-pointer"
                    onMouseDown={handleEdit}
                  />
                </div>
              )}
            </div>
            <div className="flex flex-col border-solid border-b px-5">
              <div className="text-md py-4">
                {editMode ? (
                  <input
                    className="block px-2 py-1 whitespace-pre-wrap text-size-sm w-full bg-gray-850 placeholder-gray-300 placeholder:text-sm"
                    onChange={e => setTitleText(e.target.value)}
                    value={titleText}
                  />
                ) : (
                  issue?.title
                )}
              </div>
              <div className="text-sm pb-4 text-gray-100 overflow-auto whitespace-pre-wrap">
                {editMode ? (
                  <textarea
                    className="block  px-2 py-1 whitespace-pre-wrap text-size-sm w-full bg-gray-850 h-[calc(100vh-340px)] placeholder-gray-300 placeholder:text-sm"
                    onChange={e => setDescriptionText(e.target.value)}
                    value={descriptionText}
                  />
                ) : isLoading && description === null ? (
                  'Loading...'
                ) : (
                  <Remark>{description?.body || ''}</Remark>
                )}
              </div>
            </div>
            <div className="text-md py-4 px-5 text-white">Comments</div>
            {CommentsList(comments, isLoading && description === null)}
            <div className="mx-3 bg-gray-850 flex-1 mx- mt-0 mb-3 flex-1 border-transparent rounded full py-3 px-3 relative whitespace-pre-wrap ">
              <textarea
                className="block flex-1 whitespace-pre-wrap text-size-sm w-full bg-gray-850 min-h-[6rem] placeholder-gray-300 placeholder:text-sm"
                placeholder="Leave a comment ..."
                onChange={e => setCommentText(e.target.value)}
                value={commentText}
              />
              <div className="flex justify-end">
                <button
                  className="px-3 ml-2 mt-2 rounded h-8 focus:outline-none bg-gray text-white "
                  onMouseDown={handleAddComment}
                >
                  Comment
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="hidden md:block flex flex-[1_0_0] min-w-0 p-3">
          <div className="max-w-4xl">
            <div className="flex border-solid border-b px-5">
              {/* For consistent spacing with left col */}
              <div className="text-sm invisible">
                <EditIcon className="!w-4" />
              </div>
            </div>
            <div className="flex flex-col px-5 py-4 text-sm">
              <div className="flex flex-row items-center my-1">
                <div className="w-20">Status</div>
                <StatusMenu
                  onSelect={handleChangeStatus}
                  status={issue?.status || 'BACKLOG'}
                  labelVisible={true}
                />
              </div>
              <div className="flex flex-row items-center my-1">
                <div className="w-20">Priority</div>
                <PriorityMenu
                  onSelect={handleChangePriority}
                  labelVisible={true}
                  priority={issue?.priority || 'NONE'}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
