import { useState, useEffect, useCallback } from 'react';

/**
 * A custom hook to manage loading states with automatic timeout
 * @param initialState Initial loading state
 * @param timeoutMs Timeout in milliseconds after which loading will be automatically reset
 * @returns [loading, setLoading, resetLoading] - loading state, setter, and reset function
 */
export function useLoadingState(initialState = false, timeoutMs = 10000) {
  const [loading, setLoadingState] = useState(initialState);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [timeoutId]);

  // Set loading state with automatic timeout
  const setLoading = useCallback((newState: boolean) => {
    setLoadingState(newState);
    
    // Clear any existing timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }
    
    // Set a new timeout if loading is being set to true
    if (newState === true) {
      const id = setTimeout(() => {
        console.log(`Loading state automatically reset after ${timeoutMs}ms timeout`);
        setLoadingState(false);
      }, timeoutMs);
      setTimeoutId(id);
    }
  }, [timeoutId, timeoutMs]);

  // Reset loading state and clear timeout
  const resetLoading = useCallback(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }
    setLoadingState(false);
  }, [timeoutId]);

  return [loading, setLoading, resetLoading] as const;
}
