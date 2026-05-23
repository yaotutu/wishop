import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  on: vi.fn(),
  checkForUpdates: vi.fn(async () => undefined),
  quitAndInstall: vi.fn(),
  firstWindowSend: vi.fn(),
  secondWindowSend: vi.fn(),
}));

vi.mock('electron-updater', () => ({
  autoUpdater: {
    autoDownload: false,
    autoInstallOnAppQuit: false,
    on: mocks.on,
    checkForUpdates: mocks.checkForUpdates,
    quitAndInstall: mocks.quitAndInstall,
  },
}));

vi.mock('./utils/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
  })),
}));

const { initUpdater } = await import('./updater');

function createWindow(send: (channel: string, payload?: unknown) => void): any {
  return {
    isDestroyed: vi.fn(() => false),
    webContents: { send },
  };
}

describe('updater initialization', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('registers updater listeners once and sends events to the latest window', async () => {
    initUpdater(createWindow(mocks.firstWindowSend));
    initUpdater(createWindow(mocks.secondWindowSend));

    expect(mocks.on).toHaveBeenCalledTimes(5);

    const updateAvailable = mocks.on.mock.calls.find(call => call[0] === 'update-available')?.[1];
    updateAvailable?.({ version: '2.0.0' });

    expect(mocks.firstWindowSend).not.toHaveBeenCalled();
    expect(mocks.secondWindowSend).toHaveBeenCalledWith('update:available', { version: '2.0.0' });

    await vi.runAllTimersAsync();
    expect(mocks.checkForUpdates).toHaveBeenCalledTimes(1);
  });
});
