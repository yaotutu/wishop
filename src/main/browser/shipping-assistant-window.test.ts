import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BrowserWindow } from 'electron';
import type { ShippingAssistantSession } from '../../shared/types';

type MockWindow = {
  options?: Record<string, unknown>;
  webContents: {
    id: number;
    reload: ReturnType<typeof vi.fn>;
    on: ReturnType<typeof vi.fn>;
    off: ReturnType<typeof vi.fn>;
  };
  getBounds: ReturnType<typeof vi.fn>;
  isDestroyed: ReturnType<typeof vi.fn>;
  isMinimized: ReturnType<typeof vi.fn>;
  restore: ReturnType<typeof vi.fn>;
  showInactive: ReturnType<typeof vi.fn>;
  focus: ReturnType<typeof vi.fn>;
  hide: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  loadURL: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  once: ReturnType<typeof vi.fn>;
  off: ReturnType<typeof vi.fn>;
  setAlwaysOnTop: ReturnType<typeof vi.fn>;
  moveTop: ReturnType<typeof vi.fn>;
  setParentWindow: ReturnType<typeof vi.fn>;
};

const mocks = vi.hoisted(() => {
  let nextWebContentsId = 100;
  const createdWindows: MockWindow[] = [];
  const display = {
    workArea: { x: 0, y: 0, width: 1600, height: 1000 },
  };

  function createWindow(options?: Record<string, unknown>): MockWindow {
    return {
      options,
      webContents: {
        id: nextWebContentsId++,
        reload: vi.fn(),
        on: vi.fn(),
        off: vi.fn(),
      },
      getBounds: vi.fn(() => ({ x: 100, y: 80, width: 1000, height: 800 })),
      isDestroyed: vi.fn(() => false),
      isMinimized: vi.fn(() => false),
      restore: vi.fn(),
      showInactive: vi.fn(),
      focus: vi.fn(),
      hide: vi.fn(),
      close: vi.fn(),
      loadURL: vi.fn(),
      on: vi.fn(),
      once: vi.fn((event: string, callback: () => void) => {
        if (event === 'ready-to-show') callback();
      }),
      off: vi.fn(),
      setAlwaysOnTop: vi.fn(),
      moveTop: vi.fn(),
      setParentWindow: vi.fn(),
    };
  }

  return {
    createdWindows,
    display,
    handle: vi.fn(),
    getDisplayMatching: vi.fn(() => display),
    getOrderAssociations: vi.fn(() => []),
    runPurchaseLookupAutomation: vi.fn(),
    setOrderAssociation: vi.fn((_accountId: string, orderId: string, input: any) => ({
      orderId,
      internalRemark: input.internalRemark,
      linkedOrders: input.linkedOrders,
      createdAt: 1,
      updatedAt: 1,
    })),
    createWindow,
    BrowserWindow: vi.fn(function BrowserWindow(this: unknown, options?: Record<string, unknown>) {
      const win = createWindow(options);
      createdWindows.push(win);
      return win;
    }),
  };
});

vi.mock('electron', () => ({
  BrowserWindow: mocks.BrowserWindow,
  ipcMain: {
    handle: mocks.handle,
  },
  screen: {
    getDisplayMatching: mocks.getDisplayMatching,
  },
}));

vi.mock('../store', () => ({
  getConfig: vi.fn(),
  getOrderAssociations: mocks.getOrderAssociations,
  getRealAddressCache: vi.fn(),
  setOrderAssociation: mocks.setOrderAssociation,
  setRealAddressCache: vi.fn(),
}));

vi.mock('../wxshop/client-registry', () => ({
  getClient: vi.fn(),
}));

vi.mock('../services/taobao-automation-service', () => ({
  runPurchaseLookupAutomation: mocks.runPurchaseLookupAutomation,
}));

const { closeShippingAssistantWindows, openShippingAssistantWindow } = await import('./shipping-assistant-window');

function createSession(orderId = 'order-1'): ShippingAssistantSession {
  return {
    accountId: 'account-1',
    orderId,
    product: {
      product_id: 'product-1',
      title: '商品',
      sku_code: 'sku-1',
      sku_attrs: [],
      sku_cnt: 1,
    },
    source: {
      id: 'source-1',
      url: 'https://item.taobao.com/item.htm?id=1',
      quantity: 1,
      createdAt: 1,
      updatedAt: 1,
    },
  } as ShippingAssistantSession;
}

describe('shipping assistant window ownership', () => {
  beforeEach(() => {
    closeShippingAssistantWindows();
    vi.clearAllMocks();
    mocks.createdWindows.length = 0;
  });

  it('creates the assistant as a child of the Taobao shipping window', () => {
    const taobaoWindow = mocks.createWindow() as unknown as BrowserWindow;

    openShippingAssistantWindow(taobaoWindow, 'baseline', createSession());

    expect(mocks.BrowserWindow).toHaveBeenCalledTimes(1);
    expect(mocks.createdWindows[0].options).toMatchObject({
      parent: taobaoWindow,
    });
  });

  it('rebinds an existing assistant to the current Taobao shipping window', () => {
    const firstTaobaoWindow = mocks.createWindow() as unknown as BrowserWindow;
    const secondTaobaoWindow = mocks.createWindow() as unknown as BrowserWindow;

    openShippingAssistantWindow(firstTaobaoWindow, 'baseline', createSession('order-1'));
    openShippingAssistantWindow(secondTaobaoWindow, 'baseline', createSession('order-2'));

    expect(mocks.BrowserWindow).toHaveBeenCalledTimes(1);
    expect(mocks.createdWindows[0].setParentWindow).toHaveBeenCalledWith(secondTaobaoWindow);
    expect(mocks.createdWindows[0].webContents.reload).toHaveBeenCalledTimes(1);
  });

  it('associates the paid Taobao order when the shipping window reaches the payment success page', async () => {
    const taobaoWindow = mocks.createWindow() as unknown as BrowserWindow;

    openShippingAssistantWindow(taobaoWindow, 'baseline', createSession('order-1'));

    const navigationHandler = (taobaoWindow as unknown as MockWindow).webContents.on.mock.calls
      .find(([event]) => event === 'did-navigate')?.[1] as ((event: unknown, url: string) => Promise<void>) | undefined;
    expect(navigationHandler).toBeTypeOf('function');

    await navigationHandler?.({}, 'https://web.m.taobao.com/app/tbpc-trade/tbpc-pay-success/home?biz_order_id=tb-123');

    expect(mocks.setOrderAssociation).toHaveBeenCalledWith('account-1', 'order-1', {
      internalRemark: '',
      linkedOrders: [expect.objectContaining({
        platform: 'taobao',
        platformOrderId: 'tb-123',
      })],
    });
    expect(mocks.runPurchaseLookupAutomation).toHaveBeenCalledWith(
      taobaoWindow,
      { accountId: 'account-1', orderId: 'order-1', platformOrderId: 'tb-123' },
      expect.objectContaining({
        getOrderAssociations: expect.any(Function),
        setOrderAssociation: expect.any(Function),
      }),
    );
  });
});
