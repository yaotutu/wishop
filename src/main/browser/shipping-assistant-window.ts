import { BrowserWindow, ipcMain, screen } from 'electron';
import path from 'path';
import type { CheckoutAddressFillResult, OrderRealAddressCache, ShippingAssistantSession } from '../../shared/types';
import { getRealAddressCache, setRealAddressCache } from '../store';
import { getClient } from '../wxshop/client-registry';
import { openCleanBrowserWindow } from './clean-taobao-window.js';
import { assistantHtml, normalizeAssistantSession } from './shipping-assistant-page.js';

const SHIPPING_ASSISTANT_WIDTH = 420;

const shippingAssistantWindows = new Map<string, BrowserWindow>();
const shippingAssistantSessions = new Map<number, ShippingAssistantSession>();

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
  assistant.setAlwaysOnTop(true, 'floating');
  assistant.moveTop();
}

function bindAssistantVisibilityToTaobao(taobaoWindow: BrowserWindow, assistant: BrowserWindow): void {
  const showWithTaobao = () => showAssistantWithTaobao(assistant);
  const hideWithTaobao = () => {
    if (!assistant.isDestroyed()) assistant.hide();
  };
  const releaseIfNotActive = () => {
    setTimeout(() => {
      if (assistant.isDestroyed()) return;
      const taobaoActive = !taobaoWindow.isDestroyed() && taobaoWindow.isFocused();
      const assistantActive = assistant.isFocused();
      if (!taobaoActive && !assistantActive) {
        assistant.setAlwaysOnTop(false);
        assistant.hide();
      }
    }, 120);
  };

  taobaoWindow.on('focus', showWithTaobao);
  taobaoWindow.on('show', showWithTaobao);
  taobaoWindow.on('restore', showWithTaobao);
  taobaoWindow.on('blur', releaseIfNotActive);
  taobaoWindow.on('hide', hideWithTaobao);
  taobaoWindow.on('minimize', hideWithTaobao);
  taobaoWindow.on('closed', hideWithTaobao);
  assistant.on('blur', releaseIfNotActive);
  assistant.on('focus', () => assistant.setAlwaysOnTop(true, 'floating'));

  assistant.on('closed', () => {
    taobaoWindow.off('focus', showWithTaobao);
    taobaoWindow.off('show', showWithTaobao);
    taobaoWindow.off('restore', showWithTaobao);
    taobaoWindow.off('blur', releaseIfNotActive);
    taobaoWindow.off('hide', hideWithTaobao);
    taobaoWindow.off('minimize', hideWithTaobao);
    taobaoWindow.off('closed', hideWithTaobao);
  });
}

export function closeShippingAssistantWindows(): void {
  shippingAssistantWindows.forEach(win => {
    if (!win.isDestroyed()) win.close();
  });
  shippingAssistantWindows.clear();
}

export function openCleanBrowserShippingAssistant(
  parent: BrowserWindow,
  profileId: string,
  url: string,
  session: ShippingAssistantSession,
): void {
  const taobaoWindow = openCleanBrowserWindow(parent, profileId, url);
  const existing = shippingAssistantWindows.get(profileId);
  if (existing && !existing.isDestroyed()) {
    shippingAssistantSessions.set(existing.webContents.id, session);
    existing.webContents.reload();
    showAssistantWithTaobao(existing);
    return;
  }

  const assistantBounds = getAssistantInitialBounds(taobaoWindow);
  const assistant = new BrowserWindow({
    ...assistantBounds,
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
  bindAssistantVisibilityToTaobao(taobaoWindow, assistant);

  assistant.once('ready-to-show', () => {
    showAssistantWithTaobao(assistant);
    assistant.focus();
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
    const address = await getClient(session.accountId).decodeOrderSensitiveInfo(session.orderId);
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
