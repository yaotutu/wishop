import { useState, useCallback, useEffect } from 'react';

interface UseIpcFetchResult<T> {
  data: T;
  loading: boolean;
  fetch: () => Promise<void>;
  setData: React.Dispatch<React.SetStateAction<T>>;
}

export function useIpcFetch<T>(
  accountId: string,
  fetcher: () => Promise<T>,
  defaultValue: T,
  options?: { autoFetch?: boolean },
): UseIpcFetchResult<T> {
  const [data, setData] = useState<T>(defaultValue);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    try {
      setData(await fetcher());
    } finally {
      setLoading(false);
    }
  }, [accountId, fetcher]);

  useEffect(() => {
    if (options?.autoFetch !== false) {
      fetch();
    }
  }, [accountId]);

  return { data, loading, fetch, setData };
}
