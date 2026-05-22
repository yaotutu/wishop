import { BrowserWindow, ipcMain, screen, session } from 'electron';
import path from 'path';
import type { CheckoutAddressFillResult, OrderRealAddressCache, ShippingAssistantSession } from '../../shared/types';
import { getRealAddressCache, setRealAddressCache } from '../store';
import { getClient } from '../wxshop/client-registry';

const CLEAN_PARTITION_PREFIX = 'persist:taobao-clean-';
const SHIPPING_ASSISTANT_WIDTH = 420;

const cleanBrowserWindows = new Map<string, BrowserWindow>();
const shippingAssistantWindows = new Map<string, BrowserWindow>();
const shippingAssistantSessions = new Map<number, ShippingAssistantSession>();
let isQuitting = false;

export function setBrowserQuitting(value: boolean): void {
  isQuitting = value;
}

export async function flushBrowserSession(profileId = 'baseline'): Promise<void> {
  const ses = session.fromPartition(`${CLEAN_PARTITION_PREFIX}${profileId}`);
  ses.flushStorageData();
  await ses.cookies.flushStore();
}

export function openCleanBrowserWindow(parent: BrowserWindow, profileId: string, url = 'https://www.taobao.com'): BrowserWindow {
  const existingWindow = cleanBrowserWindows.get(profileId);
  if (existingWindow && !existingWindow.isDestroyed()) {
    existingWindow.show();
    existingWindow.focus();
    if (existingWindow.webContents.getURL() !== url) {
      existingWindow.loadURL(url);
    }
    return existingWindow;
  }

  const partition = `${CLEAN_PARTITION_PREFIX}${profileId}`;
  const parentBounds = parent.getBounds();
  const width = Math.min(1280, Math.floor(parentBounds.width * 0.9));
  const height = Math.min(860, Math.floor(parentBounds.height * 0.9));
  const x = parentBounds.x + Math.floor((parentBounds.width - width) / 2);
  const y = parentBounds.y + Math.floor((parentBounds.height - height) / 2);

  const cleanBrowserWindow = new BrowserWindow({
    width,
    height,
    x,
    y,
    parent,
    closable: true,
    minimizable: true,
    maximizable: true,
    resizable: true,
    title: '淘宝',
    webPreferences: {
      partition,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  cleanBrowserWindow.webContents.setWindowOpenHandler(({ url: newUrl }) => {
    cleanBrowserWindow.loadURL(newUrl);
    return { action: 'deny' };
  });

  cleanBrowserWindow.on('close', (event) => {
    if (isQuitting) return;
    event.preventDefault();
    cleanBrowserWindow.hide();
  });

  cleanBrowserWindow.on('closed', () => {
    cleanBrowserWindows.delete(profileId);
  });

  cleanBrowserWindows.set(profileId, cleanBrowserWindow);
  cleanBrowserWindow.loadURL(url);
  return cleanBrowserWindow;
}

export function getCleanBrowserWindow(): BrowserWindow | null {
  return cleanBrowserWindows.get('baseline') || cleanBrowserWindows.values().next().value || null;
}

export function closeBrowserWindow(): void {
  shippingAssistantWindows.forEach(win => {
    if (!win.isDestroyed()) win.close();
  });
  shippingAssistantWindows.clear();
  cleanBrowserWindows.forEach(win => {
    if (!win.isDestroyed()) win.hide();
  });
}

function formatPrice(cents?: number): string {
  if (cents === undefined || cents === null) return '-';
  return `¥${(cents / 100).toFixed(2)}`;
}

function formatTime(timestamp?: number): string {
  if (!timestamp) return '-';
  return new Date(timestamp * 1000).toLocaleString('zh-CN');
}

function skuText(session: ShippingAssistantSession): string {
  const attrs = session.product.sku_attrs
    ?.map(attr => [attr.attr_key, attr.attr_value].filter(Boolean).join(': '))
    .filter(Boolean)
    .join(' / ');
  return attrs || session.product.sku_code || '无规格';
}

function assistantHtml(): string {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>发货助手</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #fff; color: #1f1f1f; }
    .shell { height: 100vh; display: flex; flex-direction: column; }
    .header { height: 48px; display: flex; align-items: center; justify-content: space-between; padding: 0 14px; border-bottom: 1px solid #f0f0f0; font-weight: 600; }
    .close { border: 0; background: transparent; font-size: 20px; cursor: pointer; color: #666; width: 28px; height: 28px; }
    .content { flex: 1; overflow: auto; padding: 12px; display: grid; gap: 12px; }
    .card { border: 1px solid #f0f0f0; border-radius: 6px; padding: 10px; display: grid; gap: 8px; }
    .row { display: grid; grid-template-columns: 72px minmax(0, 1fr); gap: 8px; font-size: 13px; line-height: 1.5; }
    .label { color: #8c8c8c; }
    .value { min-width: 0; word-break: break-all; white-space: pre-wrap; }
    .actions { display: flex; flex-wrap: wrap; gap: 8px; }
    button { border: 1px solid #d9d9d9; background: #fff; border-radius: 4px; padding: 5px 10px; font-size: 13px; cursor: pointer; }
    button.primary { background: #1677ff; border-color: #1677ff; color: #fff; }
    button:disabled { cursor: not-allowed; opacity: .55; }
    .muted { color: #8c8c8c; }
    .toast { min-height: 20px; color: #1677ff; font-size: 12px; }
  </style>
</head>
<body>
  <div class="shell">
    <div class="header"><span>发货助手</span><button class="close" id="close">×</button></div>
    <div class="content">
      <div class="card" id="order"></div>
      <div class="card">
        <div class="row"><div class="label">收货信息</div><div class="value" id="address">未获取真实地址</div></div>
        <div class="actions">
          <button class="primary" id="fetch">获取真实地址</button>
          <button id="refresh">刷新</button>
          <button id="copyAddress">复制地址</button>
          <button id="fill">自动填地址</button>
        </div>
      </div>
      <div class="card" id="notes"></div>
      <div class="actions"><button id="copyOrder">复制订单</button></div>
      <div class="toast" id="toast"></div>
    </div>
  </div>
  <script>
    let session = null;
    let address = null;
    const $ = (id) => document.getElementById(id);
    const toast = (text, isError) => {
      $('toast').textContent = text || '';
      $('toast').style.color = isError ? '#cf1322' : '#1677ff';
      if (text) setTimeout(() => { if ($('toast').textContent === text) $('toast').textContent = ''; }, 3200);
    };
    const phoneLine = (addr) => {
      if (!addr) return '';
      const virtual = addr.virtual_number_info;
      if (virtual && virtual.virtual_number) return '虚拟号码：' + virtual.virtual_number + (virtual.extension ? ' 转 ' + virtual.extension : '');
      return '电话：' + (addr.purchaser_tel_number || addr.tel_number || addr.virtual_order_tel_number || '-');
    };
    const addressLine = (addr) => addr ? [addr.province_name, addr.city_name, addr.county_name, addr.detail_info, addr.house_number].filter(Boolean).join('') : '';
    const addressCopy = (addr) => addr ? [addr.user_name + ' ' + phoneLine(addr), addressLine(addr)].filter(Boolean).join('\\n') : '';
    const skuText = () => {
      const attrs = (session.product.sku_attrs || []).map(a => [a.attr_key, a.attr_value].filter(Boolean).join(': ')).filter(Boolean).join(' / ');
      return attrs || session.product.sku_code || '无规格';
    };
    const render = () => {
      $('order').innerHTML = [
        ['微信订单', session.orderId],
        ['商品', session.product.title],
        ['规格', skuText()],
        ['数量', 'x' + session.product.sku_cnt],
        ['实付', session.orderPriceText],
        ['货源', session.source.url],
        ['货源备注', session.source.remark || '-']
      ].map(([label, value]) => '<div class="row"><div class="label">' + label + '</div><div class="value">' + String(value || '-') + '</div></div>').join('');
      $('notes').innerHTML = [
        ['买家备注', session.customerNotes || '无'],
        ['商家备注', session.merchantNotes || '无'],
        ['下单时间', session.createTimeText],
        ['支付时间', session.payTimeText]
      ].map(([label, value]) => '<div class="row"><div class="label">' + label + '</div><div class="value">' + String(value || '-') + '</div></div>').join('');
      $('address').textContent = addressCopy(address) || '未获取真实地址';
      $('fill').disabled = !address;
    };
    const copy = async (text, label) => {
      if (!text || !text.trim()) return toast('暂无' + label, true);
      await navigator.clipboard.writeText(text);
      toast(label + '已复制');
    };
    const loadAddress = async (refresh) => {
      try {
        $('fetch').disabled = true;
        $('refresh').disabled = true;
        const cache = await window.shippingAssistant.fetchAddress(refresh);
        address = cache.address;
        render();
        toast(refresh ? '真实地址已刷新' : '真实地址已获取');
      } catch (err) {
        toast('获取真实地址失败：' + (err && err.message ? err.message : err), true);
      } finally {
        $('fetch').disabled = false;
        $('refresh').disabled = false;
      }
    };
    window.shippingAssistant.getSession().then(data => {
      session = data;
      address = data.address || null;
      render();
    });
    $('close').onclick = () => window.shippingAssistant.close();
    $('fetch').onclick = () => loadAddress(false);
    $('refresh').onclick = () => loadAddress(true);
    $('copyAddress').onclick = () => copy(addressCopy(address), '地址');
    $('copyOrder').onclick = () => copy([
      '订单号: ' + session.orderId,
      '商品: ' + session.product.title,
      '规格: ' + skuText(),
      '数量: ' + session.product.sku_cnt,
      '实付: ' + session.orderPriceText,
      session.customerNotes ? '买家备注: ' + session.customerNotes : '',
      session.merchantNotes ? '商家备注: ' + session.merchantNotes : '',
      session.source.remark ? '货源备注: ' + session.source.remark : '',
      addressCopy(address) ? '地址: ' + addressCopy(address).replace('\\n', ' ') : ''
    ].filter(Boolean).join('\\n'), '订单信息');
    $('fill').onclick = async () => {
      try {
        const result = await window.shippingAssistant.fillCheckoutAddress();
        toast(result.filledFields.length ? '已填写：' + result.filledFields.join('、') : (result.warnings.join('；') || '未填写任何字段'));
      } catch (err) {
        toast('自动填写失败：' + (err && err.message ? err.message : err), true);
      }
    };
  </script>
</body>
</html>`;
}

function normalizeAssistantSession(session: ShippingAssistantSession): ShippingAssistantSession & {
  orderPriceText: string;
  createTimeText: string;
  payTimeText: string;
  skuText: string;
} {
  return {
    ...session,
    orderPriceText: formatPrice(session.orderPrice),
    createTimeText: formatTime(session.createTime),
    payTimeText: formatTime(session.payTime),
    skuText: skuText(session),
  };
}

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
    existing.show();
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

  assistant.once('ready-to-show', () => {
    assistant.show();
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
