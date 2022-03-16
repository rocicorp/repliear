# replicache-todo

A super fast todo list built with Replicache, React, Next.js, Vercel, Supabase, and Postgres.

The simplest possible starter sample for Replicache.
Intended for customers to clone and start editing.

## Prerequisites

Install the following before starting:

* Git
* Docker (and ensure the daemon is running)
* [Supabase CLI](https://github.com/supabase/cli)

## Setup

```bash
git clone https://github.com/rocicorp/replicache-todo
cd replicache-todo
npm install
supabase init
supabase start
```

To run `replicache-todo` app, run the following command but substitute each angle-bracket-wrapped parameter with the corresponding value which was output from `supabase start`.

```bash
DATABASE_URL="<DB URL>" NEXT_PUBLIC_SUPABASE_URL="<API URL>" NEXT_PUBLIC_SUPABASE_KEY="<anon key>" npm run dev
```

## Publishing

* Push this repo to a new github project
* Create a free account on supabase.com, and an empty project
* Create a free account on vercel.com
* Create a new project on vercel, configuring the environment variables using the values from your hosted Supabase project

## TODO

- Fix completeAllTodos() to use scan when https://github.com/rocicorp/replicache/issues/607 is fixed
- Implement implicit db creation, or put a script in the package, then remove api/init.ts
- Switch to Superstruct
- Add instructions about provisioning Supabase and working locally
