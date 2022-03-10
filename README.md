# replicache-todo

TodoMVC/React ported to Replicache/Next.js/Postgres.

The simplest possible starter sample for Replicache.
Intended for customers to clone and start editing.

## Status

This basically works, but little bits are still left.

## Other TODOs

- Fix completeAllTodos() to use scan when https://github.com/rocicorp/replicache/issues/607 is fixed
- Implement implicit db creation, or put a script in the package, then remove api/init.ts
- Switch to Superstruct
- Add instructions about provisioning Supabase and working locally
- Publish `resolver` or whatever is necessary to not have it in `util`
- Factor out the server into some separate open source repo
- If possible, switch to using Supabase's built-in realtime support for the poke
