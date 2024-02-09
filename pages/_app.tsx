import React from "react";
import type { AppProps } from "next/app";

import Head from "next/head";
import { Theme } from "@radix-ui/themes";

import "../styles/index.css";

import "@radix-ui/themes/styles.css";

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>Repliear</title>
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link
          rel="icon"
          type="image/png"
          href="/static/replicache-logo-96.png"
        />
      </Head>
      <Theme appearance="dark" accentColor="cyan" radius="small">
        <Component {...pageProps} />
      </Theme>
    </>
  );
}

export default MyApp;
