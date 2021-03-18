# Install

Use `yarn` and not `npm`.

```
yarn
```

# Run

You need to have `AMAZON_ACCESS_KEY_ID` and `AMAZON_SECRET_ACCESS_KEY` in your environment

## Dev version

```sh
AMAZON_ACCESS_KEY_ID=<...> AMAZON_SECRET_ACCESS_KEY=<...> yarn dev
```

## Build and run prod version

```sh
yarn build
AMAZON_ACCESS_KEY_ID=<...> AMAZON_SECRET_ACCESS_KEY=<...> yarn start
```
