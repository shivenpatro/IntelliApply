import { useCallback, useEffect, useRef, useState } from 'react';

export function useLoadingState(initialState = false) {
  const [loading, setLoadingState] = useState(initialState);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  const setLoading = useCallback((value: boolean) => {
    if (mounted.current) setLoadingState(value);
  }, []);
  const resetLoading = useCallback(() => {
    if (mounted.current) setLoadingState(false);
  }, []);
  return [loading, setLoading, resetLoading] as const;
}
