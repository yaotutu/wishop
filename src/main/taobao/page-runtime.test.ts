import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  taobaoContents: {
    isLoadingMainFrame: vi.fn(() => false),
    once: vi.fn(),
    getURL: vi.fn(() => 'https://old.taobao.com'),
    loadURL: vi.fn(),
  },
  getCleanBrowserWebContents: vi.fn(),
}));

vi.mock('../browser/browser-window', () => ({
  getCleanBrowserWebContents: mocks.getCleanBrowserWebContents,
}));

const { loadCleanTaobaoPage } = await import('./page-runtime');

describe('Taobao page runtime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mocks.getCleanBrowserWebContents.mockReturnValue(mocks.taobaoContents);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('loads the registered clean Taobao webview for the requested profile', async () => {
    const result = loadCleanTaobaoPage('profile-1', 'https://www.taobao.com');

    await vi.advanceTimersByTimeAsync(600);

    await expect(result).resolves.toBe(mocks.taobaoContents);
    expect(mocks.getCleanBrowserWebContents).toHaveBeenCalledWith('profile-1');
    expect(mocks.taobaoContents.loadURL).toHaveBeenCalledWith('https://www.taobao.com');
  });
});
