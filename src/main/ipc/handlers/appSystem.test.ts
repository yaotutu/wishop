import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  handle: vi.fn(),
  getVersion: vi.fn(() => '1.2.3'),
  checkForUpdates: vi.fn(async () => undefined),
  quitAndInstall: vi.fn(),
}));

vi.mock('electron', () => ({
  app: {
    getVersion: mocks.getVersion,
  },
  ipcMain: {
    handle: mocks.handle,
  },
}));

vi.mock('../../updater', () => ({
  checkForUpdates: mocks.checkForUpdates,
  quitAndInstall: mocks.quitAndInstall,
}));

const { registerAppSystemHandlers } = await import('./appSystem');

describe('app system ipc handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers update and app metadata channels outside window creation', async () => {
    registerAppSystemHandlers();

    expect(mocks.handle).toHaveBeenCalledTimes(3);
    expect(mocks.handle.mock.calls.map(call => call[0])).toEqual([
      'update:install',
      'update:check',
      'app:version',
    ]);

    mocks.handle.mock.calls[0][1]();
    await mocks.handle.mock.calls[1][1]();
    const version = mocks.handle.mock.calls[2][1]();

    expect(mocks.quitAndInstall).toHaveBeenCalledTimes(1);
    expect(mocks.checkForUpdates).toHaveBeenCalledTimes(1);
    expect(version).toBe('1.2.3');
  });
});
