import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './client';

/**
 * Shared query cache.
 *
 * Retry deliberately stops on 401 and 403. A 401 has already been through
 * the client's refresh-and-replay, so retrying only repeats a request whose
 * session is gone; a 403 from the subscription limits is a decision, not a
 * transient failure, and hammering it would re-open the paywall sheet on
 * every attempt.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        const status = (error as ApiError)?.status;
        if (status === 401 || status === 403 || status === 404) return false;
        return failureCount < 2;
      },
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});
