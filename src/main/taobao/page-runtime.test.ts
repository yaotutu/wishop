import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  parentWindow: { id: 'parent-window' },
  taobaoWindow: {
    webContents: {
      isLoadingMainFrame: vi.fn(() => false),
      once: vi.fn(),
    },
  },
  getCleanBrowserWindow: vi.fn(),
  openCleanBrowserWindow: vi.fn(),
}));

vi.mock('../browser/browser-window', () => ({
  getCleanBrowserWindow: mocks.getCleanBrowserWindow,
  openCleanBrowserWindow: mocks.openCleanBrowserWindow,
}));

const { loadCleanTaobaoPage } = await import('./page-runtime');

describe('Taobao page runtime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mocks.getCleanBrowserWindow.mockReturnValue(mocks.taobaoWindow);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the clean Taobao window for the requested profile', async () => {
    const result = loadCleanTaobaoPage(mocks.parentWindow as any, 'profile-1', 'https://www.taobao.com');

    await vi.advanceTimersByTimeAsync(600);

    await expect(result).resolves.toBe(mocks.taobaoWindow);
    expect(mocks.openCleanBrowserWindow).toHaveBeenCalledWith(mocks.parentWindow, 'profile-1', 'https://www.taobao.com');
    expect(mocks.getCleanBrowserWindow).toHaveBeenCalledWith('profile-1');
  });
});
