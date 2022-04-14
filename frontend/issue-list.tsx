import React, { CSSProperties, useEffect, useRef, useState } from "react";
import IssueRow from "./issue-row";
import {
  getAllIssuesCount,
  getBacklogIssues,
  Issue,
  issueKey,
  IssueValue,
  Priority,
  Status,
} from "./issue";
import AutoSizer from "react-virtualized-auto-sizer";
import { FixedSizeList } from "react-window";
import { getIssues, getActiveIssues } from "./issue";
import { useSubscribe } from "replicache-react";
import type { Replicache, ScanOptionIndexedStartKey } from "replicache";
import type { M } from "./mutators";
import { sortedIndexBy } from "lodash";

interface Props {
  onUpdateIssue: (id: string, changes: Partial<IssueValue>) => void;
  rep: Replicache<M>;
  issueFilter: "all" | "active" | "backlog";
}
const ISSUES_WINDOW_SIZE = 100;

type KeyIndexHistoryEntry = { key: ScanOptionIndexedStartKey; index: number };
const IssueList = ({ onUpdateIssue, rep, issueFilter }: Props) => {
  const [keyIndexHistory, setKeyIndexHistory] = useState<
    KeyIndexHistoryEntry[]
  >([]);
  const [startKey, setStartKey] = useState<
    undefined | ScanOptionIndexedStartKey
  >(undefined);
  const [startKeyIndex, setStartKeyIndex] = useState(0);
  const issuesWindow = useSubscribe(
    rep,
    (tx) => {
      switch (issueFilter) {
        case "active":
          return getActiveIssues(tx, startKey, ISSUES_WINDOW_SIZE);
        case "backlog":
          return getBacklogIssues(tx, startKey, ISSUES_WINDOW_SIZE);
        default:
          return getIssues(tx, startKey, ISSUES_WINDOW_SIZE);
      }
    },
    [],
    [startKey, issueFilter]
  );
  const fixedSizeListRef = useRef<FixedSizeList>(null);
  useEffect(() => {
    setKeyIndexHistory([]);
    setStartKey(undefined);
    setStartKeyIndex(0);
    console.log("fixedSizeListRef", fixedSizeListRef.current);
    if (fixedSizeListRef.current) {
      fixedSizeListRef.current.scrollTo(0);
    }
  }, [issueFilter]);

  const getIndexedStartKey = (issue: Issue): ScanOptionIndexedStartKey => {
    switch (issueFilter) {
      case "active":
        return [issue.indexActiveReverseModified, issueKey(issue.id)];
      case "backlog":
        return [(issue.indexActiveReverseModified, issueKey(issue.id))];
      default:
        return issue.indexReverseModified;
    }
  };

  const issuesCount = useSubscribe(rep, getAllIssuesCount, 0);
  const handleItemsRendered = ({
    overscanStartIndex,
    overscanStopIndex,
    visibleStartIndex,
    visibleStopIndex,
  }: {
    overscanStartIndex: number;
    overscanStopIndex: number;
    visibleStartIndex: number;
    visibleStopIndex: number;
  }) => {
    if (issuesWindow.length === 0) {
      return;
    }
    console.debug(
      "startKey",
      startKey,
      "startKeyIndex",
      startKeyIndex,
      "visibleStartIndex",
      visibleStartIndex,
      "visibleStopIndex",
      visibleStopIndex,
      "overscanStartIndex",
      overscanStartIndex,
      "overscanStopIndex",
      overscanStopIndex,
      "",
      issuesWindow.length
    );
    if (visibleStartIndex === 0) {
      setStartKey(undefined);
      setStartKeyIndex(0);
      return;
    }
    if (visibleStopIndex + 10 >= startKeyIndex + issuesWindow.length) {
      const historyEntry: KeyIndexHistoryEntry = {
        key: getIndexedStartKey(issuesWindow[0]),
        index: startKeyIndex,
      };
      const newKeyIndexHistory = [...keyIndexHistory];
      newKeyIndexHistory.splice(
        sortedIndexBy(keyIndexHistory, historyEntry, "index"),
        0,
        historyEntry
      );
      setKeyIndexHistory(newKeyIndexHistory);
      console.log("SHIFTING forwards");
      const offset = Math.min(ISSUES_WINDOW_SIZE / 2, issuesWindow.length - 1);
      const newStartIssue = issuesWindow[offset];
      setStartKey(getIndexedStartKey(newStartIssue));
      setStartKeyIndex(startKeyIndex + offset);
    } else if (visibleStartIndex - 10 < startKeyIndex) {
      console.log("SHIFTING backwards");
      let shifted = false;
      for (let i = keyIndexHistory.length - 1; i >= 0 && !shifted; i--) {
        if (keyIndexHistory[i].index <= overscanStartIndex) {
          setStartKey(keyIndexHistory[i].key);
          setStartKeyIndex(keyIndexHistory[i].index);
          shifted = true;
        }
      }
      if (!shifted) {
        console.log("COULD NOT SHIFT BACKWARDS RESETTING");
        setStartKey(undefined);
        setStartKeyIndex(0);
      }
    }
  };

  const handleChangePriority = (issue: Issue, priority: Priority) => {
    onUpdateIssue(issue.id, { priority });
  };

  const handleChangeStatus = (issue: Issue, status: Status) => {
    onUpdateIssue(issue.id, { status });
  };

  const Row = ({ index, style }: { index: number; style: CSSProperties }) =>
    index < startKeyIndex || index >= startKeyIndex + issuesWindow.length ? (
      <div style={style}></div>
    ) : (
      <div style={style}>
        <IssueRow
          issue={issuesWindow[index - startKeyIndex]}
          key={issuesWindow[index - startKeyIndex].id}
          onChangePriority={handleChangePriority}
          onChangeStatus={handleChangeStatus}
        />
      </div>
    );
  return (
    <div className="flex flex-col flex-grow overflow-auto">
      <AutoSizer>
        {({ height, width }) => (
          <FixedSizeList
            ref={fixedSizeListRef}
            height={height}
            itemCount={issuesCount}
            itemSize={43}
            overscanCount={10}
            width={width}
            onItemsRendered={handleItemsRendered}
          >
            {Row}
          </FixedSizeList>
        )}
      </AutoSizer>
    </div>
  );
};

export default IssueList;
