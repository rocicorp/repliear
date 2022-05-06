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
    <div className="flex flex-col w-full p-3 overflow-y-auto">
      <div className="flex items-center justify-between flex-shrink-0 pb-3.5 border-b-2 border-gray-5 mb-3.5 mx-4">
        <div className="text-lg text-gray-1">About this Demo</div>

        <div className="flex items-center">
          <div
            className="inline-flex items-center justify-center h-7 w-7 rounded  hover:bg-gray-400 hover-text-gray-410 text-white"
            onClick={handleClickCloseBtn}
          >
            <CloseIcon className="w-4" />
          </div>
        </div>
      </div>

      <div className="px-4 text-sm">
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
            &nbsp; Replicache
          </a>
        </span>
        ,
        <span className="text-blue">
          <a target="_blank" rel="noreferrer" href="https://nextjs.org">
            &nbsp; Next.js
          </a>
        </span>
        , and
        <span className="text-blue">
          <a target="_blank" rel="noreferrer" href="https://supabase.com">
            &nbsp; Supabase.
          </a>
        </span>
      </div>

      <div className="mt-3 px-4 text-sm">
        Linear&apos;s killer feature is performance: Every interaction
        throughout the UI responds instantly. There are zero spinners.
        Additionally, the Linear UI continuously updates automatically from the
        server. When a user changes something, other users&apos; views update
        immediately to reflect the change.
      </div>

      <div className="mt-3 px-4 text-sm">
        Replicache makes it much easier to build apps like Linear. To show how,
        this demo recreates a subset of the Linear experience, focusing on the
        distinctive features of Linear that are especially difficult to
        engineer.
      </div>

      <div className="pt-3.5 px-4 text-lg text-gray-1">Key Features</div>

      <div className=" mt-3 px-4 text-md text-gray-5">Substantial Dataset</div>
      <div className="mt-3 px-4 text-sm">
        This demo contains the entire React issue database as of mid-April 2022.
        It comprises about 11 thousands issues and about 50 MB of structured
        data.
      </div>
      <div className=" mt-3 px-4 text-md text-gray-5">
        Instant UI Responsiveness
      </div>
      <div className=" mt-3 px-4 text-sm">
        Scrolling, issue creation, issue modification, and view transition are
        all instant. There are no spinners, and every mutation is optimistic.
        Even details like the number of active issues update immediately to
        reflect changes.
      </div>
      <div className="mt-3 px-4 text-md text-gray-5">Complex filters</div>
      <div className="mt-3 px-4 text-sm">
        Use the filter picker to build complex multi-attribute filters. The
        response is instant, with zero network requests.
      </div>
      <div className="mt-3 px-4 text-md text-gray-5">
        Realtime Sync Throughout
      </div>
      <div className="mt-3 px-4 text-sm">
        Changes made by one user are instantly reflected to other users, even if
        they are looking at a different view. Replicache syncs the entire data
        model under the covers, and since the views are rendered from that data
        model they update automatically when it changes.
      </div>

      <div className="pt-3.5 px-4 text-lg text-gray-1">Learn More</div>
      <div className="mt-3 px-4 text-sm">
        Replicache is the best way to build applications like Linear. Learn more
        at{" "}
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

      <div className="mt-3 px-4 text-sm">
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
  );

  return (
    <Modal isOpen={isOpen} center={false} size="wide" onDismiss={onDismiss}>
      {body}
    </Modal>
  );
}
