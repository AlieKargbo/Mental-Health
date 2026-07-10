import { useState, useEffect, useCallback, useRef } from 'react';

interface UseAutoRefreshOptions {
  interval?: number; // in milliseconds
  enabled?: boolean;
}

export const useAutoRefresh = (
  refreshFunction: () => Promise<void> | void,
  options: UseAutoRefreshOptions = {}
) => {
  const { interval = 30000, enabled = true } = options;
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [nextRefresh, setNextRefresh] = useState<Date>(new Date(Date.now() + interval));
  const intervalRef = useRef<number | null>(null);
  const lastCallRef = useRef<number>(0);

  // Remove unused executeRefresh function since we use inline wrapper

  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!enabled) return;

    // Create a wrapper function to avoid stale closure with rate limiting
    const refreshWrapper = async () => {
      const now = Date.now();
      
      // Rate limiting: prevent calls more frequent than 5 seconds
      if (now - lastCallRef.current < 5000) {
        console.log('Auto-refresh: Rate limited, skipping call');
        return;
      }
      
      if (isRefreshing) {
        console.log('Auto-refresh: Already refreshing, skipping call');
        return;
      }
      
      lastCallRef.current = now;
      console.log('Auto-refresh: Executing refresh');
      
      setIsRefreshing(true);
      try {
        await refreshFunction();
        const refreshTime = new Date();
        setLastRefresh(refreshTime);
        setNextRefresh(new Date(refreshTime.getTime() + interval));
      } catch (error) {
        console.error('Auto-refresh failed:', error);
      } finally {
        setIsRefreshing(false);
      }
    };

    // Initial refresh (with delay to prevent immediate call)
    const initialTimeout = setTimeout(refreshWrapper, 1000);

    // Set up interval
    intervalRef.current = setInterval(refreshWrapper, interval);

    return () => {
      clearTimeout(initialTimeout);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, interval]); // Keep minimal dependencies

  const manualRefresh = useCallback(async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      await refreshFunction();
      const now = new Date();
      setLastRefresh(now);
      setNextRefresh(new Date(now.getTime() + interval));
    } catch (error) {
      console.error('Manual refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshFunction, interval, isRefreshing]);

  return {
    isRefreshing,
    lastRefresh,
    nextRefresh,
    manualRefresh
  };
};