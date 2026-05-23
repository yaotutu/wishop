import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ShippingAssistantSession } from '../../shared/types';

const mocks = vi.hoisted(() => ({
  taobaoWindow: { id: 'taobao-window' },
  parentWindow: { id: 'parent-window' },
  openCleanBrowserWindow: vi.fn(),
  openShippingAssistantWindow: vi.fn(),
  closeShippingAssistantWindows: vi.fn(),
  hideCleanBrowserWindows: vi.fn(),
}));

vi.mock('./clean-taobao-window.js', () => ({
  flushBrowserSession: vi.fn(),
  getCleanBrowserWindow: vi.fn(),
  hideCleanBrowserWindows: mocks.hideCleanBrowserWindows,
  openCleanBrowserWindow: mocks.openCleanBrowserWindow,
  setBrowserQuitting: vi.fn(),
}));

vi.mock('./shipping-assistant-window.js', () => ({
  closeShippingAssistantWindows: mocks.closeShippingAssistantWindows,
  openShippingAssistantWindow: mocks.openShippingAssistantWindow,
  registerShippingAssistantHandlers: vi.fn(),
}));

const { closeBrowserWindow, openCleanBrowserShippingAssistant } = await import('./browser-window');

describe('browser window facade', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.openCleanBrowserWindow.mockReturnValue(mocks.taobaoWindow);
  });

  it('opens the clean Taobao window before creating the shipping assistant', () => {
    const session = { accountId: 'account-1', orderId: 'order-1' } as ShippingAssistantSession;

    openCleanBrowserShippingAssistant(mocks.parentWindow as any, 'baseline', 'https://item.taobao.com', session);

    expect(mocks.openCleanBrowserWindow).toHaveBeenCalledWith(mocks.parentWindow, 'baseline', 'https://item.taobao.com');
    expect(mocks.openShippingAssistantWindow).toHaveBeenCalledWith(mocks.taobaoWindow, 'baseline', session);
  });

  it('closes both assistant and clean Taobao windows through the facade', () => {
    closeBrowserWindow();

    expect(mocks.closeShippingAssistantWindows).toHaveBeenCalledTimes(1);
    expect(mocks.hideCleanBrowserWindows).toHaveBeenCalledTimes(1);
  });
});
