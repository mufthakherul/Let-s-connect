import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Create QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

/**
 * AppProviders - Centralized provider wrapper
 * Extracted from App.js (Phase 1 - Workstream B1)
 * Wraps app with: Router, ThemeProvider, QueryClientProvider
 */
export default function AppProviders({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        {children}
      </Router>
    </QueryClientProvider>
  );
}
