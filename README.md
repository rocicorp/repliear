# Repliear

See: https://github.com/rocicorp/replicache/issues/857

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

To run `repliear` app, run the following command but substitute each angle-bracket-wrapped parameter with the corresponding value which was output from `supabase start`.

```bash
DATABASE_URL="<DB URL>" NEXT_PUBLIC_SUPABASE_URL="<API URL>" NEXT_PUBLIC_SUPABASE_KEY="<anon key>" npm run dev
```

## Publishing

- Push this repo to a new github project
- Create a free account on supabase.com, and an empty project
- Create a free account on vercel.com
- Create a new project on vercel, configuring the environment variables using the values from your hosted Supabase project

## Credit

Special thanks to [linear_clone](https://github.com/tuan3w/linearapp_clone) which we started with and enabled us to get the visual styling right quickly.
