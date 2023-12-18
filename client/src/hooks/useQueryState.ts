import {useState, useEffect, useCallback} from 'react';

export type QueryStateProcessor<T> = {
  toString: (value: T) => string;
  fromString: (value: string | null) => T | null;
};

export const identityProcessor = {
  toString: (value: string) => value,
  fromString: (value: string | null) => value,
};

const queryStateListenres = new Set<() => void>();

export function useQueryState<T>(
  key: string,
  processor: QueryStateProcessor<T>,
) {
  function getQueryValue() {
    const searchParams = new URLSearchParams(window.location.search);
    const param = searchParams.get(key);
    return param === null ? null : decodeURIComponent(param);
  }
  function processQueryValue(queryValue: string | null) {
    return queryValue === null ? null : processor.fromString(queryValue);
  }
  // Initialize state from the current URL
  const [value, setValue] = useState(getQueryValue);

  // Update URL when state changes
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const oldRelativePathQuery = `${
      window.location.pathname
    }?${searchParams.toString()}`;
    if (value === null) {
      searchParams.delete(key);
    } else {
      searchParams.set(key, encodeURIComponent(value));
    }
    const newRelativePathQuery = `${
      window.location.pathname
    }?${searchParams.toString()}`;
    if (oldRelativePathQuery === newRelativePathQuery) {
      return;
    }
    history.pushState(null, '', newRelativePathQuery);
    for (const listener of queryStateListenres) {
      listener();
    }
  }, [key, value, processor]);

  useEffect(() => {
    const handlePopState = () => {
      console.log('pop state event...');
      const encoded = getQueryValue();
      setValue(encoded);
    };

    // Subscribe to popstate event
    window.addEventListener('popstate', handlePopState);
    queryStateListenres.add(handlePopState);

    // Cleanup listener
    return () => {
      window.removeEventListener('popstate', handlePopState);
      queryStateListenres.delete(handlePopState);
    };
  }, [key]);

  // Wrap setValue with a callback that ensures a new function is not created on every render
  const setQueryState = useCallback(
    (newValue: T | null) => {
      const encoded = newValue === null ? null : processor.toString(newValue);
      setValue(encoded);
    },
    [setValue],
  );

  return [processQueryValue(value), setQueryState] as const;
}

export default useQueryState;
