/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { LogEntry } from '../../../shared/listing';
import type { ViolationMatch } from '../../../shared/violations';
import { useViolationWorkflow } from './hooks';

const mocks = vi.hoisted(() => ({
  getWords: vi.fn(),
  saveWords: vi.fn(),
  batchScan: vi.fn(),
  batchDelete: vi.fn(),
  scanStep: vi.fn(),
  stop: vi.fn(),
  onLog: vi.fn(),
}));

vi.mock('./client', () => ({
  violationsClient: {
    getWords: mocks.getWords,
    saveWords: mocks.saveWords,
    batchScan: mocks.batchScan,
    batchDelete: mocks.batchDelete,
    scanStep: mocks.scanStep,
    stop: mocks.stop,
    onLog: mocks.onLog,
  },
}));

function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

describe('useViolationWorkflow', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('loads and saves violation words through the domain client', async () => {
    mocks.getWords.mockResolvedValue(['old']);
    mocks.saveWords.mockResolvedValue(undefined);
    let api: ReturnType<typeof useViolationWorkflow> | undefined;

    function Probe() {
      api = useViolationWorkflow('account-1');
      return null;
    }

    const client = createQueryClient();
    render(
      <QueryClientProvider client={client}>
        <Probe />
      </QueryClientProvider>,
    );

    await waitFor(() => expect(api?.words).toEqual(['old']));

    await act(async () => {
      await api?.saveWords(['new']);
    });

    expect(mocks.saveWords).toHaveBeenCalledWith('account-1', ['new']);
    await waitFor(() => expect(api?.words).toEqual(['new']));
  });

  it('keeps batch scan state and logs inside the domain hook', async () => {
    const violation: ViolationMatch = {
      productId: 'product-1',
      title: '测试商品',
      matchedWords: ['禁词'],
    };
    const log: LogEntry = {
      id: 'log-1',
      timestamp: 1,
      runId: 'run-1',
      productId: 'product-1',
      productTitle: '测试商品',
      action: 'check',
      status: 'success',
    };
    const unsubscribe = vi.fn();
    mocks.getWords.mockResolvedValue([]);
    mocks.onLog.mockImplementation((_accountId: string, callback: (entry: LogEntry) => void) => {
      callback(log);
      return unsubscribe;
    });
    mocks.batchScan.mockResolvedValue({
      scanned: 3,
      violations: [violation],
      errors: 0,
      stopped: false,
    });
    let api: ReturnType<typeof useViolationWorkflow> | undefined;

    function Probe() {
      api = useViolationWorkflow('account-1');
      return null;
    }

    const client = createQueryClient();
    render(
      <QueryClientProvider client={client}>
        <Probe />
      </QueryClientProvider>,
    );

    await act(async () => {
      await api?.batchScan(50);
    });

    expect(mocks.onLog).toHaveBeenCalledWith('account-1', expect.any(Function));
    expect(mocks.batchScan).toHaveBeenCalledWith('account-1', 50);
    expect(unsubscribe).toHaveBeenCalled();
    await waitFor(() => {
      expect(api?.violations).toEqual([violation]);
      expect(api?.scanResult).toEqual({ scanned: 3, total: 1 });
      expect(api?.logs).toEqual([log]);
    });
  });

  it('records operation errors while still clearing running state and log subscriptions', async () => {
    const unsubscribe = vi.fn();
    mocks.getWords.mockResolvedValue([]);
    mocks.onLog.mockReturnValue(unsubscribe);
    mocks.batchScan.mockRejectedValue(new Error('扫描失败'));
    let api: ReturnType<typeof useViolationWorkflow> | undefined;

    function Probe() {
      api = useViolationWorkflow('account-1');
      return null;
    }

    const client = createQueryClient();
    render(
      <QueryClientProvider client={client}>
        <Probe />
      </QueryClientProvider>,
    );

    await act(async () => {
      await expect(api?.batchScan(50)).rejects.toThrow('扫描失败');
    });

    await waitFor(() => {
      expect(api?.error).toBe('扫描失败');
      expect(api?.scanning).toBe(false);
    });
    expect(unsubscribe).toHaveBeenCalled();
  });
});
