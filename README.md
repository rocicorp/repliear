# Repliear

A high-performance issue tracker in the style of [Linear](https://linear.app/).

Built with [Replicache](https://replicache.dev/), [Supabase](https://supabase.com/), and [Next.js](https://nextjs.org/).

Running at [repliear.vercel.app](https://repliear.vercel.app/).

## Prerequisites

Install the following before starting:

- Git
- Docker (and ensure the daemon is running)
- [Supabase CLI](https://github.com/supabase/cli)

## Setup

```bash
git clone https://github.com/rocicorp/repliear
cd repliear
npm install
supabase init
supabase start
```

## Licensing

Info about [Replicache licensing](https://doc.replicache.dev/licensing)

Get a Replicache license key.

```
npx replicache get-license
```

## Run

To run `repliear` app, run the following command but substitute each angle-bracket-wrapped parameter with the corresponding value which was output from `supabase start`.

```bash
NEXT_PUBLIC_REPLICACHE_LICENSE_KEY="<LICENSE KEY>" DATABASE_URL="<DB URL>" NEXT_PUBLIC_SUPABASE_URL="<API URL>" NEXT_PUBLIC_SUPABASE_KEY="<anon key>" npm run dev
```

## Publishing

- Push this repo to a new github project
- Create a free account on supabase.com, and an empty project
- Create a free account on vercel.com
- Create a new project on vercel, configuring the environment variables using the values from your hosted Supabase project

## Credit

We started this project by forking [linear_clone](https://github.com/tuan3w/linearapp_clone). This enabled us to get the visual styling right much faster than we otherwise could have.
