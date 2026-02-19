import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Modern hook for API calls with proper state management
 * Replaces repetitive useState patterns across components
 * 
 * @param {Function} apiFunction - The API call function
 * @param {Object} options - Configuration options
 * @returns {Object} State and functions for API call
 */
export function useApi(apiFunction, options = {}) {
  const {
    onSuccess,
    onError,
    immediate = false,
    deps = []
  } = options;

  // State machine pattern instead of boolean flags
  const [state, setState] = useState({
    status: 'idle', // idle | loading | success | error
    data: null,
    error: null
  });

  const abortControllerRef = useRef(null);

  const execute = useCallback(async (...args) => {
    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    setState({ status: 'loading', data: null, error: null });

    try {
      const data = await apiFunction(...args, {
        signal: abortControllerRef.current.signal
      });
      
      setState({ status: 'success', data, error: null });
      
      if (onSuccess) {
        onSuccess(data);
      }
      
      return { data, error: null };
    } catch (error) {
      // Ignore abort errors
      if (error.name === 'AbortError') {
        return { data: null, error: null };
      }

      setState({ status: 'error', data: null, error });
      
      if (onError) {
        onError(error);
      }
      
      return { data: null, error };
    }
  }, [apiFunction, onSuccess, onError]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Execute immediately if requested
  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [immediate, execute, ...deps]);

  return {
    ...state,
    execute,
    isLoading: state.status === 'loading',
    isSuccess: state.status === 'success',
    isError: state.status === 'error',
    isIdle: state.status === 'idle',
    reset: () => setState({ status: 'idle', data: null, error: null })
  };
}

/**
 * Hook for mutations (POST, PUT, DELETE) with optimistic updates
 */
export function useMutation(mutationFn, options = {}) {
  const {
    onSuccess,
    onError,
    onMutate,
    onSettled
  } = options;

  const [state, setState] = useState({
    status: 'idle',
    data: null,
    error: null
  });

  const mutate = useCallback(async (variables) => {
    let rollback;

    // Optimistic update
    if (onMutate) {
      rollback = await onMutate(variables);
    }

    setState({ status: 'loading', data: null, error: null });

    try {
      const data = await mutationFn(variables);
      setState({ status: 'success', data, error: null });
      
      if (onSuccess) {
        onSuccess(data, variables);
      }

      return { data, error: null };
    } catch (error) {
      setState({ status: 'error', data: null, error });
      
      // Rollback optimistic update
      if (rollback) {
        rollback();
      }

      if (onError) {
        onError(error, variables);
      }

      return { data: null, error };
    } finally {
      if (onSettled) {
        onSettled();
      }
    }
  }, [mutationFn, onSuccess, onError, onMutate, onSettled]);

  return {
    ...state,
    mutate,
    isLoading: state.status === 'loading',
    isSuccess: state.status === 'success',
    isError: state.status === 'error',
    isIdle: state.status === 'idle',
    reset: () => setState({ status: 'idle', data: null, error: null })
  };
}

/**
 * Hook for paginated data fetching
 */
export function usePaginatedApi(apiFunction, options = {}) {
  const {
    pageSize = 20,
    initialPage = 1
  } = options;

  const [page, setPage] = useState(initialPage);
  const [allData, setAllData] = useState([]);
  const [hasMore, setHasMore] = useState(true);

  const { execute, isLoading, isError, error } = useApi(
    useCallback(
      (pageNum) => apiFunction({ page: pageNum, limit: pageSize }),
      [apiFunction, pageSize]
    )
  );

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;

    const result = await execute(page);
    
    if (result.data) {
      const newItems = result.data.items || result.data;
      setAllData(prev => [...prev, ...newItems]);
      setHasMore(newItems.length === pageSize);
      setPage(prev => prev + 1);
    }
  }, [execute, page, isLoading, hasMore, pageSize]);

  const reset = useCallback(() => {
    setPage(initialPage);
    setAllData([]);
    setHasMore(true);
  }, [initialPage]);

  return {
    data: allData,
    isLoading,
    isError,
    error,
    hasMore,
    loadMore,
    reset
  };
}

export default useApi;
