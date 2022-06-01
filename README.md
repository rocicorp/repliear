# Repliear

A high-performance issue tracker in the style of [Linear](https://linear.app/).

Built with [Replicache](https://replicache.dev), [Next.js](https://nextjs.org/),
[Pusher](https://pusher.com/), and [Postgres](https://mysql.com/).

Running at [repliear.herokuapp.com](https://repliear.herokuapp.com/).

# Prerequisites

1. [Get a Replicache license key](https://doc.replicache.dev/licensing)
2. [Install PostgreSQL](https://www.postgresql.org/download/)
3. [Sign up for a free pusher.com account](https://pusher.com/)

# To run locally

```
# Create a new database for Repliear
psql -d postgres -c 'create database repliear'

export NEXT_PUBLIC_REPLICACHE_LICENSE_KEY="<your license key>"
export PGDATABASE="repliear"
export NEXT_PUBLIC_PUSHER_APP_ID=<appid>
export NEXT_PUBLIC_PUSHER_KEY=<pusherkey>
export NEXT_PUBLIC_PUSHER_SECRET=<pushersecret>
export NEXT_PUBLIC_PUSHER_CLUSTER=<pushercluster>

npm run dev
```

## Credits

We started this project by forking [linear_clone](https://github.com/tuan3w/linearapp_clone). This enabled us to get the visual styling right much faster than we otherwise could have.
