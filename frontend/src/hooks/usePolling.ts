import { useEffect, useRef, useState } from "react";

export function usePolling<T>(
  fetcher: () => Promise<T>,
  intervalMs = 30_000,
  deps: ReadonlyArray<unknown> = [],
): {
  data: T | null;
  error: string | null;
  loading: boolean;
  lastUpdated: number | null;
  refresh: () => void;
} {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [nonce, setNonce] = useState(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    let cancelled = false;
    let timer: number;

    const run = async () => {
      try {
        const result = await fetcherRef.current();
        if (!cancelled) {
          setData(result);
          setError(null);
          setLastUpdated(Date.now());
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Error de red");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    timer = window.setInterval(run, intervalMs);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs, nonce, ...deps]);

  const refresh = () => setNonce((n) => n + 1);

  return { data, error, loading, lastUpdated, refresh };
}