import CloseIcon from "./assets/icons/close.svg";
import Modal from "./modal";
import React from "react";
import classNames from "classnames";

interface Props {
  isOpen: boolean;
  onDismiss?: () => void;
}

function Title({ children }: { children: string }) {
  return <div className="text-lg text-gray-4">{children}</div>;
}

function H1({ children }: { children: string }) {
  return <div className="mt-5 text-lg text-gray-4">{children}</div>;
}

function H2({ children }: { children: string }) {
  return <div className="mt-4 text-md text-gray-4">{children}</div>;
}

function P({
  noTopMargin,
  children,
}: {
  noTopMargin?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={classNames("text-sm font-normal text-gray-5", {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        "mt-3": !noTopMargin,
      })}
    >
      {children}
    </div>
  );
}

function A({ href, children }: { href: string; children: string }) {
  return (
    <span className="text-blue">
      <a target="_blank" rel="noreferrer" href={href}>
        {children}
      </a>
    </span>
  );
}

function FeatureSection({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <>
      <H2>{title}</H2>
      <P>{children}</P>
    </>
  );
}

export default function AboutModal({ isOpen, onDismiss }: Props) {
  const handleClickCloseBtn = () => {
    if (onDismiss) onDismiss();
  };

  const body = (
    <div className="flex flex-col min-h-0">
      <div className="flex items-center justify-between flex-shrink-0 py-4 px-8 border-b border-gray-6">
        <Title>About This Demo</Title>
        <div
          className="flex items-center justify-center h-7 w-7 rounded hover:bg-gray-400"
          onClick={handleClickCloseBtn}
        >
          <CloseIcon className="w-4" />
        </div>
      </div>
      <div className="flex flex-col flex-1 px-8 pt-4 pb-8 overflow-y-auto">
        <P noTopMargin>
          Repliear is a loving &hearts; tribute to the{" "}
          <A href="https://linear.app/">Linear issue tracker</A>, built with{" "}
          <A href="https://replicache.dev">Replicache</A>,{" "}
          <A href="https://nextjs.org">Next.js</A>, and{" "}
          <A href="https://supabase.com">Supabase.</A>
        </P>

        <P>
          Linear&apos;s killer feature is performance: Every interaction
          throughout the UI responds instantly. There are zero spinners.
          Additionally, the Linear UI continuously updates automatically from
          the server. When a user changes something, other users&apos; views
          update immediately to reflect the change.
        </P>

        <P>
          Replicache makes it much easier to build apps like Linear. To show
          how, this demo recreates a subset of the Linear experience, focusing
          on the distinctive features of Linear that are especially difficult to
          engineer.
        </P>

        <H1>Key Features</H1>
        <FeatureSection title="Substantial Dataset">
          This demo contains the entire React issue database as of mid-April
          2022. It comprises about 11 thousands issues and about 50 MB of
          structured data.
        </FeatureSection>
        <FeatureSection title="Instant UI Responsiveness">
          Scrolling, issue creation, issue modification, and view transition are
          all instant. There are no spinners, and every mutation is optimistic.
          Even details like the number of active issues update immediately to
          reflect changes.
        </FeatureSection>
        <FeatureSection title="Complex Filters">
          Use the filter picker to build complex multi-attribute filters. The
          response is instant, with zero network requests.
        </FeatureSection>
        <FeatureSection title="Realtime Sync Throughout">
          Changes made by one user are instantly reflected to other users, even
          if they are looking at a different view. Replicache syncs the entire
          data model under the covers, and since the views are rendered from
          that data model they update automatically when it changes.
        </FeatureSection>

        <H1>Learn More</H1>
        <P>
          Replicache is the best way to build applications like Linear. Learn
          more at <A href="https://replicache.dev">replicache.dev</A>, or come
          visit us in <A href="https://discord.replicache.dev">Discord</A>.
        </P>

        <P>
          Check out the source for this demo at{" "}
          <A href="https://github.com/rocicorp/repliear">
            github.com/rocicorp/repliear
          </A>
          .
        </P>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      center={true}
      size="wide"
      onDismiss={onDismiss}
      className="border border-gray-6"
    >
      {body}
    </Modal>
  );
}
