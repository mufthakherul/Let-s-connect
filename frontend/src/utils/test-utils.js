/**
 * Milonexa Frontend - Testing Utilities
 * Phase 1: Foundation Testing
 */

import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * Create a test QueryClient with minimal retries
 */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

/**
 * Render a component with Router and QueryClient providers
 * Use this for components that use routing or React Query
 */
export function renderWithProviders(
  ui,
  {
    queryClient = createTestQueryClient(),
    ...renderOptions
  } = {}
) {
  function Wrapper({ children }) {
    return (
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          {children}
        </BrowserRouter>
      </QueryClientProvider>
    );
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
  };
}

/**
 * Mock localStorage for tests
 */
export const mockLocalStorage = (() => {
  let store = {};

  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString();
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

/**
 * Mock user data for tests
 */
export const mockUser = {
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  displayName: 'Test User',
  role: 'user',
  profilePicture: null,
};

/**
 * Mock auth token
 */
export const mockAuthToken = 'mock-jwt-token-for-testing';

/**
 * Setup auth mock in localStorage
 */
export function setupAuthMock() {
  mockLocalStorage.setItem('token', mockAuthToken);
  mockLocalStorage.setItem('user', JSON.stringify(mockUser));
}

/**
 * Clear auth mock
 */
export function clearAuthMock() {
  mockLocalStorage.removeItem('token');
  mockLocalStorage.removeItem('user');
}
