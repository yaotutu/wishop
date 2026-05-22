import type { BrowserWindow } from 'electron';
import { getCleanBrowserWindow, openCleanBrowserWindow } from '../browser/browser-window';
import { getOrderAssociations, setOrderAssociation } from '../store';
import type {
  CheckoutAddressFillResult,
  OrderAddressInfo,
  PurchaseLookupAutomationInput,
  PurchaseLookupAutomationResult,
  TaobaoPurchaseOrderSnapshot,
  TaobaoRefundAutomationInput,
  TaobaoRefundAutomationResult,
  TaobaoSecurityChallengeSnapshot,
} from '../../shared/types';

const LOAD_TIMEOUT_MS = 20000;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForLoad(win: BrowserWindow): Promise<void> {
  if (!win.webContents.isLoadingMainFrame()) {
    await sleep(600);
    return;
  }

  await new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, LOAD_TIMEOUT_MS);
    win.webContents.once('did-finish-load', () => {
      clearTimeout(timer);
      resolve();
    });
    win.webContents.once('did-fail-load', () => {
      clearTimeout(timer);
      resolve();
    });
  });
  await sleep(800);
}

async function loadCleanTaobaoPage(parent: BrowserWindow, profileId: string, url: string): Promise<BrowserWindow> {
  openCleanBrowserWindow(parent, profileId, url);
  const win = getCleanBrowserWindow();
  if (!win) throw new Error('淘宝窗口未打开');
  await waitForLoad(win);
  return win;
}

function mergePurchaseAssociation(
  accountId: string,
  orderId: string,
  snapshot: TaobaoPurchaseOrderSnapshot,
): ReturnType<typeof setOrderAssociation> {
  const existing = getOrderAssociations(accountId).find(item => item.orderId === orderId);
  const now = Date.now();
  const platformOrderId = snapshot.platformOrderId || '';
  const linkedOrders = existing?.linkedOrders || [];
  const matched = linkedOrders.find(item => item.platform === 'taobao' && item.platformOrderId === platformOrderId);
  const nextLinked = {
    ...matched,
    id: matched?.id || `taobao-${orderId}-${platformOrderId || now}`,
    platform: 'taobao' as const,
    platformOrderId,
    platformOrderStatus: snapshot.platformOrderStatus || matched?.platformOrderStatus || '',
    logisticsStatus: snapshot.logisticsStatus || matched?.logisticsStatus || '',
    logisticsCompany: snapshot.logisticsCompany || matched?.logisticsCompany || '',
    trackingNumber: snapshot.trackingNumber || matched?.trackingNumber || '',
    remark: snapshot.remark || matched?.remark || '',
    lastShipmentCheckStartedAt: matched?.lastShipmentCheckStartedAt || now,
    lastShipmentCheckFinishedAt: now,
    lastShipmentCheckStatus: 'completed' as const,
    lastShipmentCheckError: '',
    createdAt: matched?.createdAt || now,
    updatedAt: now,
  };

  return setOrderAssociation(accountId, orderId, {
    internalRemark: existing?.internalRemark || '',
    linkedOrders: [
      nextLinked,
      ...linkedOrders.filter(item => item.id !== matched?.id && !(item.platform === 'taobao' && item.platformOrderId === platformOrderId)),
    ],
  });
}

const CHALLENGE_SCRIPT = String.raw`
(() => {
  const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();
  const text = normalize(document.body && (document.body.innerText || document.body.textContent));
  const title = document.title || '';
  const url = location.href;
  const signals = [];
  const checks = [
    ['login', ['登录', '亲，请登录', '扫码登录', '密码登录']],
    ['slider', ['滑块', '拖动滑块', '请按住滑块']],
    ['captcha', ['验证码', '安全验证', '请输入验证码']],
    ['access-denied', ['访问被拒绝', 'deny', '拒绝访问', '风险']],
  ];
  for (const [kind, words] of checks) {
    for (const word of words) {
      if (text.includes(word) || title.includes(word)) signals.push(kind + ':' + word);
    }
  }
  const kind = signals.find(item => item.startsWith('slider:')) ? 'slider'
    : signals.find(item => item.startsWith('captcha:')) ? 'captcha'
    : signals.find(item => item.startsWith('access-denied:')) ? 'access-denied'
    : signals.find(item => item.startsWith('login:')) ? 'login'
    : 'unknown';
  return {
    detected: signals.length > 0,
    kind,
    reason: signals.length > 0 ? '淘宝页面需要人工处理' : '',
    title,
    url,
    matchedSignals: signals,
  };
})()
`;

const PURCHASE_LOOKUP_SCRIPT = String.raw`
(() => {
  const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();
  const pageText = () => normalize(document.body && (document.body.innerText || document.body.textContent));
  const valueAfterLabel = (text, labels) => {
    for (const label of labels) {
      const index = text.indexOf(label);
      if (index < 0) continue;
      const rest = text.slice(index + label.length).replace(/^[：:\s]+/, '');
      const value = rest.split(/\s{2,}|\n| {2,}/)[0];
      if (value) return normalize(value);
    }
    return '';
  };
  const exactElementTextMatches = (candidates, root) => {
    for (const element of Array.from((root || document.body).querySelectorAll('*'))) {
      const text = normalize(element.textContent);
      if (candidates.includes(text)) return text;
    }
    return '';
  };
  const ORDER_STATUS = ['交易关闭', '卖家已发货', '买家已付款', '交易成功', '等待买家付款', '退款中', '退款成功', '已签收'];
  const LOGISTICS_STATUS = ['包裹正在等待揽收', '已揽收', '运输中', '派送中', '已签收', '等待揽收', '包裹已出库'];
  const COMPANIES = ['顺丰', '中通', '圆通', '申通', '韵达', '极兔', '邮政', 'EMS', '京东', '德邦', '菜鸟'];
  const text = pageText();
  const statusRoot = document.querySelector('#headerContainer') || document.querySelector('#headerP1Container') || document.body;
  const packageText = Array.from(document.querySelectorAll('*')).map(element => normalize(element.textContent)).find(item => item.includes('包裹') && /[A-Z0-9]{8,}/i.test(item) && COMPANIES.some(company => item.includes(company))) || '';
  const packageMatch = packageText.match(/包裹\d*\s*(?:\(共\d+件\))?\s*([^\s]+?(?:速递|快递|物流|快运|邮政|EMS|顺丰|中通|圆通|申通|韵达|极兔|京东|德邦|菜鸟))\s+([A-Z0-9]{8,})/i);
  const logisticsCompany = valueAfterLabel(text, ['物流公司', '快递公司', '承运公司']) || (packageMatch && packageMatch[1]) || COMPANIES.find(company => text.includes(company)) || '';
  const trackingNumber = valueAfterLabel(text, ['运单号码', '运单号', '快递单号', '物流单号', '包裹单号']) || (packageMatch && packageMatch[2]) || '';
  const logisticsLine = Array.from(statusRoot.querySelectorAll('*')).map(element => normalize(element.textContent)).find(item => item.includes('查看物流详情') && item.includes('包裹')) || '';
  const detailMatch = logisticsLine.match(/已发货\s*(.+?)\s*查看物流详情/);
  const urlOrderId = new URL(location.href).searchParams.get('biz_order_id') || '';
  return {
    platformOrderId: urlOrderId || valueAfterLabel(text, ['订单编号', '订单号']),
    platformOrderStatus: exactElementTextMatches(ORDER_STATUS, statusRoot) || ORDER_STATUS.find(item => text.includes(item)) || '',
    logisticsStatus: valueAfterLabel(text, ['物流状态', '包裹状态', '配送状态']) || (detailMatch && detailMatch[1].trim()) || LOGISTICS_STATUS.find(item => text.includes(item)) || '',
    logisticsCompany: logisticsCompany || '',
    trackingNumber: trackingNumber || '',
    remark: location.href,
  };
})()
`;

const REFUND_PREPARE_SCRIPT = String.raw`
((input) => {
  const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();
  const visibleText = (root) => normalize(root && (root.innerText || root.textContent));
  const textContent = (root) => normalize(root && root.textContent);
  const urlOrderId = new URL(location.href).searchParams.get('bizOrderId') || '';
  if (!(location.hostname === 'refund2.taobao.com' && location.pathname.includes('/dispute/apply.htm'))) {
    throw new Error('当前页面不是淘宝退款申请页');
  }
  if (input.platformOrderId && urlOrderId && input.platformOrderId !== urlOrderId) {
    throw new Error('淘宝退款页订单号不匹配：当前 ' + urlOrderId + '，期望 ' + input.platformOrderId);
  }
  const reasonRoot = Array.from(document.querySelectorAll('.mod-select-pc')).find(select => textContent(select.querySelector('.select-title')).includes('退款原因'));
  if (!reasonRoot) throw new Error('未找到淘宝退款原因下拉框');
  const selectedWrap = reasonRoot.querySelector('.selected-wrap');
  const selectedReason = visibleText(selectedWrap);
  if (selectedReason !== input.reason) {
    selectedWrap && selectedWrap.click();
    const option = Array.from(reasonRoot.querySelectorAll('.options-item')).find(item => visibleText(item) === input.reason);
    if (!option) throw new Error('退款原因列表中没有“' + input.reason + '”');
    option.click();
  }
  const submitButton = document.querySelector('#submitButtonContainer_1 .button-item') || Array.from(document.querySelectorAll('.button-item, [role="button"], button')).find(element => visibleText(element) === '提交');
  const amountInput = document.querySelector('#applyRefundFeeInput_1-input');
  const snapshot = {
    platformOrderId: input.platformOrderId || urlOrderId,
    selectedReason: visibleText(reasonRoot.querySelector('.selected-wrap')) || input.reason,
    refundAmountText: amountInput && amountInput.value ? amountInput.value.trim() : '',
    submitReady: !!submitButton && !submitButton.classList.contains('disabled'),
    url: location.href,
  };
  if (input.autoSubmit) {
    if (!snapshot.submitReady || !submitButton) throw new Error('淘宝提交按钮尚未就绪');
    submitButton.click();
    snapshot.autoSubmitted = true;
  }
  return snapshot;
})
`;

const ADDRESS_FILL_SCRIPT = String.raw`
((address) => {
  const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();
  const result = { filledFields: [], warnings: [] };
  const phone = address.virtual_number_info && address.virtual_number_info.virtual_number
    ? address.virtual_number_info.virtual_number
    : (address.purchaser_tel_number || address.tel_number || address.virtual_order_tel_number || '');
  const ext = address.virtual_number_info && address.virtual_number_info.extension ? address.virtual_number_info.extension : '';
  const name = ext ? ((address.user_name || '') + ' [拨打后输入分机号' + ext + ']').trim() : (address.user_name || '');
  const detail = [address.province_name, address.city_name, address.county_name, address.detail_info, address.house_number].filter(Boolean).join('');
  const setValue = (selector, value, label) => {
    const el = document.querySelector(selector);
    if (!el) {
      result.warnings.push('未找到' + label + '输入框');
      return;
    }
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(proto, 'value');
    descriptor && descriptor.set ? descriptor.set.call(el, value) : (el.value = value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
    result.filledFields.push(label);
  };
  setValue('input#fullName[name="fullName"], input[name="fullName"]', name, '收货人');
  setValue('input#mobile[name="mobile"], input[name="mobile"]', phone, '手机号');
  setValue('.cndzk-entrance-associate-area-textarea, textarea', detail, '详细地址');
  if (!normalize(document.body && document.body.innerText).includes('收货地址') && result.filledFields.length === 0) {
    result.warnings.push('当前页面未识别到淘宝地址表单');
  }
  return result;
})
`;

export async function runPurchaseLookupAutomation(parent: BrowserWindow, input: PurchaseLookupAutomationInput): Promise<PurchaseLookupAutomationResult> {
  const url = new URL('https://trade.taobao.com/trade/detail/trade_order_detail.htm');
  url.searchParams.set('biz_order_id', input.platformOrderId);
  const win = await loadCleanTaobaoPage(parent, 'baseline', url.toString());
  const challenge = await win.webContents.executeJavaScript(CHALLENGE_SCRIPT) as TaobaoSecurityChallengeSnapshot;
  if (challenge.detected && challenge.kind !== 'unknown') {
    throw new Error(`淘宝页面需要人工处理：${challenge.reason || challenge.kind}`);
  }
  const snapshot = await win.webContents.executeJavaScript(PURCHASE_LOOKUP_SCRIPT) as TaobaoPurchaseOrderSnapshot;
  snapshot.platformOrderId ||= input.platformOrderId;
  if (!snapshot.platformOrderStatus && !snapshot.logisticsStatus && !snapshot.logisticsCompany && !snapshot.trackingNumber) {
    throw new Error('未能从淘宝订单页读取到有效订单状态');
  }
  const association = mergePurchaseAssociation(input.accountId, input.orderId, snapshot);
  return { snapshot, association, challenge };
}

export async function runTaobaoRefundAutomation(parent: BrowserWindow, input: TaobaoRefundAutomationInput): Promise<TaobaoRefundAutomationResult> {
  const url = new URL('https://refund2.taobao.com/dispute/apply.htm');
  url.searchParams.set('bizOrderId', input.platformOrderId);
  url.searchParams.set('type', '1');
  const win = await loadCleanTaobaoPage(parent, 'baseline', url.toString());
  const challenge = await win.webContents.executeJavaScript(CHALLENGE_SCRIPT) as TaobaoSecurityChallengeSnapshot;
  if (challenge.detected && challenge.kind !== 'unknown') {
    throw new Error(`淘宝页面需要人工处理：${challenge.reason || challenge.kind}`);
  }
  const snapshot = await win.webContents.executeJavaScript(`${REFUND_PREPARE_SCRIPT}(${JSON.stringify({
    platformOrderId: input.platformOrderId,
    reason: input.reason || '不想要了',
    autoSubmit: !!input.autoSubmit,
  })})`);
  return { snapshot, challenge };
}

export async function fillCurrentTaobaoCheckoutAddress(address: OrderAddressInfo): Promise<CheckoutAddressFillResult> {
  const win = getCleanBrowserWindow();
  if (!win) throw new Error('淘宝窗口未打开');
  const frames = [win.webContents.mainFrame, ...win.webContents.mainFrame.frames] as Array<{ url: string; executeJavaScript: (code: string) => Promise<unknown> }>;
  const addressFrame = frames.find(frame => frame.url.includes('/member/fresh/deliver_address_frame.htm'));
  const targetFrame = addressFrame || frames[0];
  return targetFrame.executeJavaScript(`${ADDRESS_FILL_SCRIPT}(${JSON.stringify(address)})`) as Promise<CheckoutAddressFillResult>;
}
