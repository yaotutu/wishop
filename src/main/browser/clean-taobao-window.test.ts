import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  BrowserWindow: vi.fn(),
  flushStorageData: vi.fn(),
  flushStore: vi.fn(),
  fromPartition: vi.fn(),
}));

vi.mock('electron', () => ({
  BrowserWindow: mocks.BrowserWindow,
  session: {
    fromPartition: mocks.fromPartition,
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

  it('loads a Taobao preload that masks navigator.webdriver in page context', () => {
    const parent = {
      getBounds: vi.fn(() => ({ x: 10, y: 20, width: 1200, height: 900 })),
    };
    const taobaoWindow = {
      isDestroyed: vi.fn(() => false),
      getBounds: vi.fn(() => ({ x: 70, y: 65, width: 1080, height: 810 })),
      loadURL: vi.fn(),
      on: vi.fn(),
      webContents: {
        setWindowOpenHandler: vi.fn(),
        getURL: vi.fn(() => ''),
        canGoBack: vi.fn(() => false),
        canGoForward: vi.fn(() => false),
        on: vi.fn(),
      },
    };
    const toolbarWindow = {
      isDestroyed: vi.fn(() => false),
      loadURL: vi.fn(),
      on: vi.fn(),
      once: vi.fn(),
      webContents: {
        on: vi.fn(),
        once: vi.fn(),
        executeJavaScript: vi.fn(() => Promise.resolve()),
      },
    };
    mocks.BrowserWindow
      .mockImplementationOnce(function BrowserWindow() {
        return taobaoWindow;
      })
      .mockImplementationOnce(function BrowserWindow() {
        return toolbarWindow;
      });

    cleanWindow.openCleanBrowserWindow(parent, 'baseline', 'https://www.taobao.com');

    expect(mocks.BrowserWindow).toHaveBeenNthCalledWith(1, expect.objectContaining({
      webPreferences: expect.objectContaining({
        preload: expect.stringMatching(/preload[/\\]taobao-browser\.js$/),
      }),
    }));
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
