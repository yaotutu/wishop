import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  hideCleanBrowserWindows: vi.fn(),
}));

vi.mock('./clean-taobao-window.js', () => ({
  flushBrowserSession: vi.fn(),
  flushBrowserSessionWithTimeout: vi.fn(),
  getCleanBrowserWebContents: vi.fn(),
  getCleanBrowserWindow: vi.fn(),
  hideCleanBrowserWindows: mocks.hideCleanBrowserWindows,
  isBrowserQuitting: vi.fn(),
  registerCleanBrowserWebContents: vi.fn(),
  setBrowserQuitting: vi.fn(),
  unregisterCleanBrowserWebContents: vi.fn(),
}));

vi.mock('./shipping-assistant-window.js', () => ({
  registerShippingAssistantHandlers: vi.fn(),
}));

const { closeBrowserWindow } = await import('./browser-window');

describe('browser facade', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('clears the embedded Taobao browser registration when closed', () => {
    closeBrowserWindow();

    expect(mocks.hideCleanBrowserWindows).toHaveBeenCalledTimes(1);
  });
});
