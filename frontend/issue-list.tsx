import React, { CSSProperties, useState } from "react";
import IssueRow from "./issue-row";
import { Issue, issueKey, IssueValue, Priority, Status } from "./issue";
import AutoSizer from "react-virtualized-auto-sizer";
import { FixedSizeList } from "react-window";
import { getIssues } from "./issue";
import { useSubscribe } from "replicache-react";
import type { Replicache } from "replicache";
import type { M } from "./mutators";
import { sortedIndexBy } from "lodash";

interface Props {
  //issues: Issue[];
  onUpdateIssue: (id: string, changes: Partial<IssueValue>) => void;
  rep: Replicache<M>;
}
const ISSUES_WINDOW_SIZE = 200;

const IssueList = ({ onUpdateIssue, rep }: Props) => {
  const [keyIndexHistory, setKeyIndexHistory] = useState<
    { key: string; index: number }[]
  >([]);
  const [startKey, setStartKey] = useState("");
  const [startKeyIndex, setStartKeyIndex] = useState(0);
  const currIssues = useSubscribe(
    rep,
    (tx) => {
      return getIssues(
        tx,
        startKey === "" ? undefined : startKey,
        ISSUES_WINDOW_SIZE
      );
    },
    []
  );
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
    if (currIssues.length === 0) {
      return;
    }
    console.log(
      "startKey",
      startKey,
      "\nstartKeyIndex",
      startKeyIndex,
      "\nvisibleStartIndex",
      visibleStartIndex,
      "\nvisibleStopIndex",
      visibleStopIndex,
      "\noverscanStartIndex",
      overscanStartIndex,
      "\noverscanStopIndex",
      overscanStopIndex,
      "\n",
      currIssues.length
    );
    if (visibleStopIndex + 10 >= startKeyIndex + currIssues.length) {
      const historyEntry = {
        key: issueKey(currIssues[0].id),
        index: startKeyIndex,
      };
      const newKeyIndexHistory = [...keyIndexHistory];
      newKeyIndexHistory.splice(
        sortedIndexBy(keyIndexHistory, historyEntry, "index"),
        0,
        historyEntry
      );
      setKeyIndexHistory(newKeyIndexHistory);
      console.log("shifting forwards");
      setStartKey(issueKey(currIssues[ISSUES_WINDOW_SIZE / 2].id));
      setStartKeyIndex(startKeyIndex + ISSUES_WINDOW_SIZE / 2);
    } else if (visibleStartIndex - 10 < startKeyIndex) {
      console.log("shifting backwards");
      for (let i = keyIndexHistory.length - 1; i >= 0; i--) {
        if (keyIndexHistory[i].index <= overscanStartIndex) {
          setStartKey(keyIndexHistory[i].key);
          setStartKeyIndex(keyIndexHistory[i].index);
          break;
        }
      }
    }
  };

  // // sort issues by id
  // const issues = currIssues.sort((a, b) => {
  //   const aModified = a.modified;
  //   const bModified = b.modified;
  //   return aModified - bModified;
  // });

  const handleChangePriority = (issue: Issue, priority: Priority) => {
    onUpdateIssue(issue.id, { priority });
  };

  const handleChangeStatus = (issue: Issue, status: Status) => {
    onUpdateIssue(issue.id, { status });
  };

  const Row = ({ index, style }: { index: number; style: CSSProperties }) =>
    index < startKeyIndex || index >= startKeyIndex + currIssues.length ? (
      <div style={style}></div>
    ) : (
      <div style={style}>
        <IssueRow
          issue={currIssues[index - startKeyIndex]}
          key={currIssues[index - startKeyIndex].id}
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
            height={height}
            // Need to maintain an issue count in
            // replicache state
            itemCount={10000}
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
