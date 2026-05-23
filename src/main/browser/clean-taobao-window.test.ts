import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  flushStorageData: vi.fn(),
  flushStore: vi.fn(),
  fromPartition: vi.fn(),
  fromId: vi.fn(),
}));

vi.mock('electron', () => ({
  session: {
    fromPartition: mocks.fromPartition,
  },
  webContents: {
    fromId: mocks.fromId,
  },
}));

const cleanWindow = await import('./clean-taobao-window') as any;

describe('clean Taobao window session flush', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    mocks.fromPartition.mockReturnValue({
      flushStorageData: mocks.flushStorageData,
      cookies: { flushStore: mocks.flushStore },
    });
  });

  it('returns the registered Taobao webContents for automation', () => {
    const contents = { isDestroyed: vi.fn(() => false) };
    mocks.fromId.mockReturnValue(contents);

    cleanWindow.registerCleanBrowserWebContents('baseline', 42);

    expect(cleanWindow.getCleanBrowserWebContents('baseline')).toBe(contents);
    expect(mocks.fromId).toHaveBeenCalledWith(42);
  });

  it('returns false when session flushing does not finish before the timeout', async () => {
    expect(cleanWindow.flushBrowserSessionWithTimeout).toBeTypeOf('function');
    vi.useFakeTimers();
    mocks.flushStore.mockReturnValue(new Promise(() => undefined));

    const result = cleanWindow.flushBrowserSessionWithTimeout('baseline', 100);
    await vi.advanceTimersByTimeAsync(100);

    await expect(result).resolves.toBe(false);
    expect(mocks.fromPartition).toHaveBeenCalledWith('persist:taobao-clean-baseline');
    expect(mocks.flushStorageData).toHaveBeenCalledTimes(1);
    expect(mocks.flushStore).toHaveBeenCalledTimes(1);
  });

  it('returns true when session flushing completes within the timeout', async () => {
    expect(cleanWindow.flushBrowserSessionWithTimeout).toBeTypeOf('function');
    mocks.flushStore.mockResolvedValue(undefined);

    await expect(cleanWindow.flushBrowserSessionWithTimeout('baseline', 100)).resolves.toBe(true);
  });
});
