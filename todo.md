- fitler client returned in pull to just those in same client group

  - i think what we want to do generally is:
    - select all the [id, version] pairs for an entity that should be in the client view,
      via whatever query makes sense.
    - for replicache_client this will be clientGroupID filter, but for other entities it
      could theoretically be whatever, and we can use this later for paging.
    - take the result of that query and join it twice with client_view_entry:
      - once to find new rows
      - once to find deleted rows
      - i believe either join can be used to find modified rows
    - i'm hoping that this strategy allows postgres to stream the diff, like it is now, without
      having to slurp the entire client view into memory.

- put paging back (by way of expanding a window incrementally that controls what we are syncing)

- don't bump client version when no changes
- decide on client_view_record vs client_view
- make sure all files are snake_case
- make sure all tables and columns are snake_case
- add lease to pull
