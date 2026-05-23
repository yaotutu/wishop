/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { cleanup, render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useScheduledJobs } from './hooks';

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
}));

vi.mock('./client', () => ({
  scheduledJobsClient: {
    list: mocks.list,
    add: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));

function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 10_000,
      },
      mutations: { retry: false },
    },
  });
}

describe('useScheduledJobs', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('fetches scheduled jobs on mount instead of treating an empty fallback as fresh data', async () => {
    mocks.list.mockResolvedValue([]);

    function Probe() {
      useScheduledJobs();
      return null;
    }

    render(
      <QueryClientProvider client={createQueryClient()}>
        <Probe />
      </QueryClientProvider>,
    );

    await waitFor(() => expect(mocks.list).toHaveBeenCalledOnce());
  });
});
