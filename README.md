![Replicache logo](https://uploads-ssl.webflow.com/623a2f46e064937599256c2d/6269e72c61073c3d561a5015_Lockup%20v2.svg)

# repliear-row-versioning

This is a demonstration of the [Row Version Strategy](https://doc.replicache.dev/strategies/row-version).

A high-performance issue tracker in the style of Linear.

Built with [Replicache](https://replicache.dev), [ViteJS](https://vitejs.dev/),
and [Postgres](https://www.postgresql.org/).


## 1. Setup

#### Get your Replicache License Key

```bash
$ npx replicache get-license
```

#### Set your `VITE_REPLICACHE_LICENSE_KEY` environment variable

```bash
$ export VITE_REPLICACHE_LICENSE_KEY="<your license key>"
```

#### Install Postgres

Install PostgreSQL. On MacOS, we recommend using [Postgres.app](https://postgresapp.com/). For other OSes and options, see [Postgres Downloads](https://www.postgresql.org/download/).

Once installed, set your database url

```bash
$ export DATABASE_URL="postgresql://localhost/repliear"
```

and create a postrgres DB

```bash
$ psql -d postgres -c 'create database repliear'
```

#### Install and Build

```bash
$ npm install; npm run build;
```

## 2. Start frontend and backend watcher

```bash
$ npm run watch --ws
```

Provides an example integrating replicache with react in a simple todo application.
