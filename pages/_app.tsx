import React from "react";
import { AppProps } from "next/app";

import Head from "next/head";

import "../styles/index.css";

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <meta name="viewport" content="viewport-fit=cover" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}

export default MyApp;
