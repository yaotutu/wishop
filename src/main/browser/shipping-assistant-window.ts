import { BrowserWindow, ipcMain, screen } from 'electron';
import path from 'path';
import type { CheckoutAddressFillResult, LinkedPlatformOrder, OrderRealAddressCache, ShippingAssistantSession } from '../../shared/types';
import { normalizeLinkedPurchaseOrder, PAID_TAOBAO_ASSOCIATION_REMARK } from '../../shared/purchase-status';
import { getConfig, getOrderAssociations, getRealAddressCache, setOrderAssociation, setRealAddressCache } from '../store';
import { runPurchaseLookupAutomation } from '../services/taobao-automation-service';
import { createLogger } from '../utils/logger';
import { getClient } from '../wxshop/client-registry';
import { assistantHtml, normalizeAssistantSession } from './shipping-assistant-page.js';

const SHIPPING_ASSISTANT_WIDTH = 420;
const logger = createLogger('ShippingAssistant', 'system');

const shippingAssistantWindows = new Map<string, BrowserWindow>();
const shippingAssistantSessions = new Map<number, ShippingAssistantSession>();
const paidTaobaoAssociationKeys = new Set<string>();

function getAssistantInitialBounds(referenceWindow: BrowserWindow): Electron.Rectangle {
  const bounds = referenceWindow.getBounds();
  const display = screen.getDisplayMatching(bounds);
  const area = display.workArea;
  const width = SHIPPING_ASSISTANT_WIDTH;
  const height = Math.min(720, Math.max(560, area.height - 120));
  const rightSideX = bounds.x + bounds.width + 12;
  const leftSideX = bounds.x - width - 12;
  const x = rightSideX + width <= area.x + area.width
    ? rightSideX
    : leftSideX >= area.x
      ? leftSideX
      : area.x + area.width - width - 16;
  const y = Math.min(Math.max(bounds.y + 40, area.y + 16), area.y + area.height - height - 16);
  return { x, y, width, height };
}

function showAssistantWithTaobao(assistant: BrowserWindow): void {
  if (assistant.isDestroyed()) return;
  if (assistant.isMinimized()) assistant.restore();
  assistant.showInactive();
}

function bindAssistantLifecycleToTaobao(taobaoWindow: BrowserWindow, assistant: BrowserWindow): void {
  const showWithTaobao = () => showAssistantWithTaobao(assistant);
  const hideWithTaobao = () => {
    if (!assistant.isDestroyed()) assistant.hide();
  };

  taobaoWindow.on('show', showWithTaobao);
  taobaoWindow.on('restore', showWithTaobao);
  taobaoWindow.on('hide', hideWithTaobao);
  taobaoWindow.on('minimize', hideWithTaobao);
  taobaoWindow.on('closed', hideWithTaobao);

  assistant.on('closed', () => {
    taobaoWindow.off('show', showWithTaobao);
    taobaoWindow.off('restore', showWithTaobao);
    taobaoWindow.off('hide', hideWithTaobao);
    taobaoWindow.off('minimize', hideWithTaobao);
    taobaoWindow.off('closed', hideWithTaobao);
  });
}

function readPaySuccessOrderId(url?: string): string {
  if (!url) return '';
  try {
    const current = new URL(url);
    if (current.hostname !== 'web.m.taobao.com') return '';
    if (!current.pathname.includes('/app/tbpc-trade/tbpc-pay-success/home')) return '';
    return current.searchParams.get('biz_order_id')?.trim() || '';
  } catch {
    return '';
  }
}

function buildPaidTaobaoLinkedOrder(
  existingLinked: LinkedPlatformOrder | undefined,
  platformOrderId: string,
  timestamp: number,
): LinkedPlatformOrder {
  const normalizedExisting = existingLinked ? normalizeLinkedPurchaseOrder(existingLinked) : undefined;
  return {
    id: normalizedExisting?.id || `taobao-${platformOrderId}-${timestamp}`,
    platform: 'taobao',
    platformOrderId,
    platformOrderStatus: normalizedExisting?.platformOrderStatus || '',
    logisticsStatus: normalizedExisting?.logisticsStatus || '',
    logisticsCompany: normalizedExisting?.logisticsCompany || '',
    trackingNumber: normalizedExisting?.trackingNumber || '',
    remark: normalizedExisting?.remark || PAID_TAOBAO_ASSOCIATION_REMARK,
    createdAt: normalizedExisting?.createdAt || timestamp,
    updatedAt: timestamp,
  };
}

async function associatePaidTaobaoOrder(
  taobaoWindow: BrowserWindow,
  session: ShippingAssistantSession,
  platformOrderId: string,
): Promise<void> {
  const key = `${session.accountId}:${session.orderId}:${platformOrderId}`;
  if (paidTaobaoAssociationKeys.has(key)) return;
  paidTaobaoAssociationKeys.add(key);

  const existing = getOrderAssociations(session.accountId).find(item => item.orderId === session.orderId);
  const linkedOrder = buildPaidTaobaoLinkedOrder(existing?.linkedOrders[0], platformOrderId, Date.now());
  setOrderAssociation(session.accountId, session.orderId, {
    internalRemark: existing?.internalRemark || '',
    linkedOrders: [linkedOrder],
  });

  try {
    await runPurchaseLookupAutomation(taobaoWindow, {
      accountId: session.accountId,
      orderId: session.orderId,
      platformOrderId,
    }, { getOrderAssociations, setOrderAssociation });
  } catch (error) {
    logger.warn(`淘宝付款成功订单 ${platformOrderId} 已关联，但同步发货状态失败`, error);
  }
}

function bindPaymentSuccessAssociation(taobaoWindow: BrowserWindow, assistant: BrowserWindow, session: ShippingAssistantSession): void {
  const handleUrl = (url?: string) => {
    if (shippingAssistantSessions.get(assistant.webContents.id) !== session) return;
    const platformOrderId = readPaySuccessOrderId(url);
    if (!platformOrderId) return;
    void associatePaidTaobaoOrder(taobaoWindow, session, platformOrderId);
  };
  const handleNavigation = (_event: Electron.Event, url: string) => handleUrl(url);

  taobaoWindow.webContents.on('did-navigate', handleNavigation);
  taobaoWindow.webContents.on('did-navigate-in-page', handleNavigation);

  assistant.on('closed', () => {
    if (taobaoWindow.isDestroyed()) return;
    taobaoWindow.webContents.off('did-navigate', handleNavigation);
    taobaoWindow.webContents.off('did-navigate-in-page', handleNavigation);
  });
}

export function closeShippingAssistantWindows(): void {
  shippingAssistantWindows.forEach(win => {
    if (!win.isDestroyed()) win.close();
  });
  shippingAssistantWindows.clear();
}

export function openShippingAssistantWindow(
  taobaoWindow: BrowserWindow,
  profileId: string,
  session: ShippingAssistantSession,
): void {
  const existing = shippingAssistantWindows.get(profileId);
  if (existing && !existing.isDestroyed()) {
    existing.setParentWindow(taobaoWindow);
    shippingAssistantSessions.set(existing.webContents.id, session);
    bindPaymentSuccessAssociation(taobaoWindow, existing, session);
    existing.webContents.reload();
    showAssistantWithTaobao(existing);
    return;
  }

  const assistantBounds = getAssistantInitialBounds(taobaoWindow);
  const assistant = new BrowserWindow({
    ...assistantBounds,
    parent: taobaoWindow,
    frame: true,
    show: false,
    resizable: true,
    minimizable: true,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: false,
    title: '发货助手',
    webPreferences: {
      preload: path.join(__dirname, '..', '..', 'preload', 'shipping-assistant.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  shippingAssistantWindows.set(profileId, assistant);
  shippingAssistantSessions.set(assistant.webContents.id, session);

  assistant.on('closed', () => {
    shippingAssistantWindows.delete(profileId);
    shippingAssistantSessions.delete(assistant.webContents.id);
  });
  bindAssistantLifecycleToTaobao(taobaoWindow, assistant);
  bindPaymentSuccessAssociation(taobaoWindow, assistant, session);

  assistant.once('ready-to-show', () => {
    showAssistantWithTaobao(assistant);
  });
  assistant.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(assistantHtml())}`);
}

let shippingAssistantHandlersRegistered = false;

export function registerShippingAssistantHandlers(): void {
  if (shippingAssistantHandlersRegistered) return;
  shippingAssistantHandlersRegistered = true;

  ipcMain.handle('shippingAssistant:getSession', (event): ReturnType<typeof normalizeAssistantSession> => {
    const session = shippingAssistantSessions.get(event.sender.id);
    if (!session) throw new Error('发货助手会话不存在');
    return normalizeAssistantSession(session);
  });

  ipcMain.handle('shippingAssistant:fetchAddress', async (event, refresh: boolean): Promise<OrderRealAddressCache> => {
    const session = shippingAssistantSessions.get(event.sender.id);
    if (!session) throw new Error('发货助手会话不存在');
    const existing = refresh ? null : getRealAddressCache(session.accountId, session.orderId);
    if (existing) {
      session.address = existing.address;
      return existing;
    }
    const address = await getClient(session.accountId, getConfig(session.accountId)).decodeOrderSensitiveInfo(session.orderId);
    session.address = address;
    return setRealAddressCache(session.accountId, session.orderId, address);
  });

  ipcMain.handle('shippingAssistant:fillCheckoutAddress', async (event): Promise<CheckoutAddressFillResult> => {
    const session = shippingAssistantSessions.get(event.sender.id);
    if (!session?.address) throw new Error('请先获取真实地址');
    const { fillCurrentTaobaoCheckoutAddress } = await import('../services/taobao-automation-service.js');
    return fillCurrentTaobaoCheckoutAddress(session.address);
  });

  ipcMain.handle('shippingAssistant:close', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && !win.isDestroyed()) win.hide();
  });
}
