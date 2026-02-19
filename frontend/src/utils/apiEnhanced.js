/**
 * Enhanced API client with modern features:
 * - Request deduplication
 * - Automatic retries
 * - Request/response caching
 * - Optimistic updates support
 */

import api from './api';

// Request deduplication
const pendingRequests = new Map();

function getRequestKey(config) {
  return `${config.method}:${config.url}:${JSON.stringify(config.params || {})}`;
}

/**
 * Deduplicated API call - prevents multiple identical requests
 */
export async function apiCall(config) {
  const key = getRequestKey(config);
  
  // Return existing pending request if available
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key);
  }
  
  const promise = api(config)
    .then(response => {
      pendingRequests.delete(key);
      return response;
    })
    .catch(error => {
      pendingRequests.delete(key);
      throw error;
    });
  
  pendingRequests.set(key, promise);
  return promise;
}

/**
 * Retry logic for failed requests
 */
export async function apiCallWithRetry(config, options = {}) {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    retryOn = [408, 429, 500, 502, 503, 504]
  } = options;
  
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall(config);
    } catch (error) {
      lastError = error;
      const status = error.response?.status;
      
      // Don't retry on client errors (except specific ones)
      if (status && !retryOn.includes(status)) {
        throw error;
      }
      
      // Don't retry on last attempt
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Exponential backoff
      const delay = retryDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * Simple in-memory cache for GET requests
 */
class ApiCache {
  constructor(ttl = 60000) {
    this.cache = new Map();
    this.ttl = ttl;
  }
  
  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }
  
  set(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
  
  invalidate(pattern) {
    if (!pattern) {
      this.cache.clear();
      return;
    }
    
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}

const cache = new ApiCache(60000); // 1 minute TTL

/**
 * Cached API call for GET requests
 */
export async function apiCallCached(config, cacheOptions = {}) {
  const {
    ttl = 60000,
    forceRefresh = false
  } = cacheOptions;
  
  // Only cache GET requests
  if (config.method && config.method.toUpperCase() !== 'GET') {
    return apiCall(config);
  }
  
  const key = getRequestKey(config);
  
  if (!forceRefresh) {
    const cached = cache.get(key);
    if (cached) {
      return { data: cached };
    }
  }
  
  const response = await apiCall(config);
  cache.set(key, response.data);
  
  return response;
}

/**
 * Invalidate cache by pattern
 */
export function invalidateCache(pattern) {
  cache.invalidate(pattern);
}

/**
 * Batch multiple API calls
 */
export async function apiCallBatch(configs, options = {}) {
  const {
    parallel = true,
    stopOnError = false
  } = options;
  
  if (parallel) {
    if (stopOnError) {
      return Promise.all(configs.map(config => apiCall(config)));
    } else {
      return Promise.allSettled(configs.map(config => apiCall(config)));
    }
  } else {
    const results = [];
    for (const config of configs) {
      try {
        const result = await apiCall(config);
        results.push({ status: 'fulfilled', value: result });
      } catch (error) {
        if (stopOnError) {
          throw error;
        }
        results.push({ status: 'rejected', reason: error });
      }
    }
    return results;
  }
}

/**
 * Optimistic update wrapper
 */
export function createOptimisticUpdate(options = {}) {
  const {
    updateCache,
    rollback,
    invalidateOnSuccess = true
  } = options;
  
  return async (mutationFn, variables) => {
    let rollbackData;
    
    try {
      // Apply optimistic update
      if (updateCache) {
        rollbackData = updateCache(variables);
      }
      
      // Perform mutation
      const result = await mutationFn(variables);
      
      // Invalidate cache on success
      if (invalidateOnSuccess) {
        invalidateCache();
      }
      
      return result;
    } catch (error) {
      // Rollback on error
      if (rollback && rollbackData) {
        rollback(rollbackData);
      }
      throw error;
    }
  };
}

/**
 * Prefetch data for better UX
 */
export async function prefetch(configs) {
  return Promise.allSettled(
    configs.map(config => apiCallCached(config))
  );
}

/**
 * Helper to create a cancellable request
 */
export function createCancellableRequest(config) {
  const controller = new AbortController();
  
  const promise = apiCall({
    ...config,
    signal: controller.signal
  });
  
  return {
    promise,
    cancel: () => controller.abort()
  };
}

export default {
  call: apiCall,
  callWithRetry: apiCallWithRetry,
  callCached: apiCallCached,
  batch: apiCallBatch,
  invalidateCache,
  prefetch,
  createCancellableRequest,
  createOptimisticUpdate
};
