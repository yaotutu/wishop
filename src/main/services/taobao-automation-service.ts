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
async (address) => {
  const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();
  const isVisible = (element) => {
    if (!element) return false;
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
  };
  const normalizeAddressPart = (value) => normalize(value || '').replace(/\s+/g, '');
  const PLACEHOLDER_CITY_NAMES = new Set(['市辖区', '县', '省直辖县级行政区划']);
  const NO_STREET_OPTION_TEXTS = ['暂不选择', '暂不选择街道', '不选择', '无街道', '其他'];
  const addressCandidates = (value) => {
    const normalized = normalizeAddressPart(value);
    if (!normalized) return [];
    if (normalized === '暂不选择') return NO_STREET_OPTION_TEXTS;
    const suffixless = normalized
      .replace(/(维吾尔自治区|壮族自治区|回族自治区|自治区|特别行政区|自治州|地区|林区|新区|省|市|区|县|镇|乡|街道|盟)$/u, '');
    const citySuffix = normalized.endsWith('市') ? normalized.slice(0, -1) : '';
    return Array.from(new Set([normalized, suffixless, citySuffix].filter(Boolean)));
  };
  const inferStreetName = (addr) => {
    const text = String((addr.county_name || '') + (addr.detail_info || '') + (addr.house_number || ''));
    const match = text.match(/([\u4e00-\u9fa5A-Za-z0-9]+?(?:街道|镇|乡|苏木|民族乡|开发区|工业园区|园区|农场))/u);
    return match && match[1] ? match[1] : '';
  };
  const stripLeadingDivisionNames = (text, divisions) => {
    let next = normalize(text);
    for (let attempt = 0; attempt < 4; attempt++) {
      const previous = next;
      for (const division of divisions) {
        const normalized = normalizeAddressPart(division);
        if (!normalized) continue;
        const matched = addressCandidates(normalized).sort((a, b) => b.length - a.length).find(candidate => next.startsWith(candidate));
        if (matched) {
          next = next.slice(matched.length).trim();
          break;
        }
      }
      if (next === previous) break;
    }
    return next || normalize(text);
  };
  const normalizeCheckoutAddress = (addr) => {
    const warnings = [];
    const province = normalizeAddressPart(addr.province_name);
    const city = normalizeAddressPart(addr.city_name);
    const county = normalizeAddressPart(addr.county_name);
    const street = normalizeAddressPart(inferStreetName(addr));
    const divisions = [];
    if (province) divisions.push({ label: '省', value: province });
    if (city && !PLACEHOLDER_CITY_NAMES.has(city)) {
      divisions.push({ label: '市', value: city });
      if (county && county !== city) divisions.push({ label: '区县', value: county });
    } else if (county) {
      divisions.push({ label: '市/区县', value: county });
    } else if (city) {
      warnings.push('已忽略微信地址占位城市：' + city);
    }
    if (street) {
      const lastDivision = divisions[divisions.length - 1] && divisions[divisions.length - 1].value;
      if (street !== lastDivision) divisions.push({ label: '街道', value: street });
    } else {
      divisions.push({ label: '街道', value: '暂不选择' });
    }
    const virtual = addr.virtual_number_info;
    const extension = virtual && virtual.extension ? String(virtual.extension).trim() : '';
    const phone = virtual && virtual.virtual_number
      ? String(virtual.virtual_number).trim()
      : String(addr.purchaser_tel_number || addr.tel_number || addr.virtual_order_tel_number || '').trim();
    const name = extension ? String((addr.user_name || '') + ' [拨打后输入分机号' + extension + ']').trim() : String(addr.user_name || '');
    const rawDetail = String((addr.detail_info || '') + (addr.house_number || ''));
    const fullLine = String((addr.province_name || '') + (addr.city_name || '') + (addr.county_name || '') + (addr.detail_info || '') + (addr.house_number || ''));
    const detail = stripLeadingDivisionNames(rawDetail || fullLine, divisions.map(item => item.value));
    return { divisions, detail, name, phone, warnings };
  };
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  const result = { filledFields: [], warnings: [] };
  const normalized = normalizeCheckoutAddress(address);
  result.warnings.push(...normalized.warnings);
  const setValue = (selector, value, label) => {
    const el = Array.from(document.querySelectorAll(selector)).find(isVisible);
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
  const waitForOption = async (candidates) => {
    for (let attempt = 0; attempt < 20; attempt++) {
      const option = Array.from(document.querySelectorAll('.cndzk-entrance-division-box-content-tag'))
        .filter(isVisible)
        .find(element => candidates.some(candidate => normalizeAddressPart(element.textContent) === candidate));
      if (option) return option;
      await sleep(120);
    }
    return null;
  };
  const trigger = Array.from(document.querySelectorAll('.cndzk-entrance-division-header-click')).find(isVisible);
  if (!trigger) {
    result.warnings.push('未找到省市区街道选择器');
  } else {
    trigger.click();
    await sleep(180);
    for (const division of normalized.divisions) {
      const candidates = addressCandidates(division.value);
      const option = await waitForOption(candidates);
      if (!option) {
        result.warnings.push('未找到' + division.label + '：' + division.value);
        continue;
      }
      option.click();
      result.filledFields.push(division.label);
      await sleep(220);
    }
  }
  setValue('.cndzk-entrance-associate-area-textarea, textarea', normalized.detail, '详细地址');
  setValue('input#fullName[name="fullName"], input[name="fullName"]', normalized.name, '收货人');
  setValue('input#mobile[name="mobile"], input[name="mobile"]', normalized.phone, '手机号');
  return result;
}
`;

const OPEN_CHECKOUT_ADDRESS_EDITOR_SCRIPT = String.raw`
(async () => {
  const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();
  const isVisible = (element) => {
    if (!element) return false;
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
  };
  const editorTexts = ['使用新地址', '新增地址', '添加地址', '添加收货地址', '新建地址'];
  const existingFrame = document.querySelector('iframe[src*="/member/fresh/deliver_address_frame.htm"]');
  if (existingFrame) return { opened: true, reason: '地址表单已打开', url: location.href };
  const target = Array.from(document.querySelectorAll('button, a, span, div, [role="button"]'))
    .filter(isVisible)
    .find(element => editorTexts.some(text => normalize(element.textContent) === text));
  if (!target) {
    return { opened: false, reason: '当前页面未找到“使用新地址/新增地址”入口', url: location.href, title: document.title };
  }
  target.click();
  return { opened: true, reason: '已点击新地址入口', url: location.href };
})()
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
  const openResult = await win.webContents.executeJavaScript(OPEN_CHECKOUT_ADDRESS_EDITOR_SCRIPT) as { opened: boolean; reason: string };
  if (!openResult.opened) {
    return { filledFields: [], warnings: [openResult.reason || '未找到新建地址表单'] };
  }

  let addressFrame: { url: string; executeJavaScript: (code: string) => Promise<unknown> } | undefined;
  for (let attempt = 0; attempt < 30; attempt++) {
    const frames = [win.webContents.mainFrame, ...win.webContents.mainFrame.frames] as Array<{ url: string; executeJavaScript: (code: string) => Promise<unknown> }>;
    addressFrame = frames.find(frame => frame.url.includes('/member/fresh/deliver_address_frame.htm'));
    if (addressFrame) break;
    await sleep(150);
  }
  if (!addressFrame) {
    return { filledFields: [], warnings: ['未找到新建地址表单，请先在淘宝下单页打开或选择“使用新地址”'] };
  }

  return addressFrame.executeJavaScript(`(${ADDRESS_FILL_SCRIPT})(${JSON.stringify(address)})`) as Promise<CheckoutAddressFillResult>;
}
