import CloseIcon from "./assets/icons/close.svg";
import Modal from "./modal";
import React from "react";

interface Props {
  isOpen: boolean;
  onDismiss?: () => void;
}

export default function AboutModal({ isOpen, onDismiss }: Props) {
  const handleClickCloseBtn = () => {
    if (onDismiss) onDismiss();
  };

  const body = (
    <div className="flex flex-col w-full py-4 overflow-y-auto">
      <div className="flex items-center justify-end flex-shrink-0">
        <div className="flex items-center">
          <div
            className="inline-flex items-center justify-center mr-2 h-7 w-7 rounded  hover:bg-gray-400 hover-text-gray-410 text-white"
            onClick={handleClickCloseBtn}
          >
            <CloseIcon className="w-4" />
          </div>
        </div>
      </div>
      <div className="flex flex-col flex-1 pb-3.5">
        {/* Issue title */}
        <div className="flex items-center w-full mt-1.5 px-4">
          <div className="text-lg text-yellow">About this Demo</div>
        </div>
      </div>
      <div className="flex w-full px-4">
        <div className="text-sm">
          Repliear is a loving &hearts; tribute to the
          <span className="text-blue">
            <a target="_blank" rel="noreferrer" href="https://linear.app/">
              {" "}
              Linear issue tracker
            </a>
          </span>
          , built with
          <span className="text-blue">
            <a target="_blank" rel="noreferrer" href="https://replicache.dev">
              {" "}
              Replicache
            </a>
          </span>
          <span className="text-blue">
            <a target="_blank" rel="noreferrer" href="https://nextjs.org">
              , Next.js
            </a>
          </span>
          <span className="text-blue">
            <a target="_blank" rel="noreferrer" href="https://supabase.com">
              , and Supabase.
            </a>
          </span>
        </div>
      </div>
      <div className="flex w-full mt-3 px-4">
        <div className="text-sm">
          Linear&apos;s killer feature is performance: Every interaction
          throughout the UI responds instantly. There are zero spinners.
          Additionally, the Linear UI continuously updates automatically from
          the server. When a user changes something, other users&apos; views
          update immediately to reflect the change.
        </div>
      </div>
      <div className="flex items-center w-full mt-3 px-4">
        <div className="text-sm">
          Replicache makes it much easier to build apps like Linear. To show
          how, this demo recreates a subset of the Linear experience, focusing
          on the distinctive features of Linear that are especially difficult to
          engineer.
        </div>
      </div>
      <div className="flex flex-col flex-1 pt-3.5 overflow-y-auto">
        <div className="flex items-center w-full mt-1.5 px-4">
          <div className="text-lg text-yellow">Key Features</div>
        </div>
      </div>
      <div className="flex items-center w-full mt-3 px-4">
        <div className="text-md text-blue">Substantial Dataset</div>
      </div>
      <div className="flex items-center w-full mt-3 px-4">
        <div className="text-sm">
          This demo contains the entire React issue database as of mid-April
          2022. It comprises about 11 thousands issues and about 50 MB of
          structured data.
        </div>
      </div>
      <div className="flex items-center w-full mt-3 px-4">
        <div className="text-md text-blue">Instant UI Responsiveness</div>
      </div>
      <div className="flex items-center w-full mt-3 px-4">
        <div className="text-sm">
          Scrolling, issue creation, issue modification, and view transition are
          all instant. There are no spinners, and every mutation is optimistic.
          Even details like the number of active issues update immediately to
          reflect changes.
        </div>
      </div>
      <div className="flex items-center w-full mt-3 px-4">
        <div className="text-md text-blue">Complex filters</div>
      </div>
      <div className="flex items-center w-full mt-3 px-4">
        <div className="text-sm">
          Use the filter picker to build complex multi-attribute filters. The
          response is instant, with zero network requests.
        </div>
      </div>
      <div className="flex items-center w-full mt-3 px-4">
        <div className="text-md text-blue">Realtime Sync Throughout</div>
      </div>
      <div className="flex items-center w-full mt-3 px-4">
        <div className="text-sm">
          Changes made by one user are instantly reflected to other users, even
          if they are looking at a different view. Replicache syncs the entire
          data model under the covers, and since the views are rendered from
          that data model they update automatically when it changes.
        </div>
      </div>

      <div className="flex items-center w-full mt-1.5 px-4">
        <div className="text-lg text-yellow">Learn More</div>
      </div>
      <div className="flex items-center w-full mt-3 px-4">
        <div className="text-sm">
          Replicache is the best way to build applications like Linear. Learn
          more at{" "}
          <span className="text-blue">
            <a target="_blank" rel="noreferrer" href="https://replicache.dev">
              {" "}
              replicache.dev
            </a>
          </span>
          , or come visit us in
          <span className="text-blue">
            <a
              target="_blank"
              rel="noreferrer"
              href="https://discord.replicache.dev"
            >
              {" "}
              Discord
            </a>
          </span>
          .
        </div>
      </div>
      <div className="flex items-center w-full mt-3 px-4">
        <div className="text-sm">
          Check out the source for this demo at
          <span className="text-blue">
            <a
              target="_blank"
              rel="noreferrer"
              href="https://github.com/rocicorp/repliear"
            >
              {" "}
              github.com/rocicorp/repliear
            </a>
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <Modal isOpen={isOpen} center={false} size="large" onDismiss={onDismiss}>
      {body}
    </Modal>
  );
}
