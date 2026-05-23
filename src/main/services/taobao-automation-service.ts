import type { BrowserWindow } from 'electron';
import { getCleanBrowserWebContents } from '../browser/browser-window';
import { ADDRESS_FILL_SCRIPT, CHALLENGE_SCRIPT, OPEN_CHECKOUT_ADDRESS_EDITOR_SCRIPT, PURCHASE_LOOKUP_SCRIPT, REFUND_PREPARE_SCRIPT } from '../taobao/page-scripts';
import { loadCleanTaobaoPage, sleep } from '../taobao/page-runtime';
import type {
  CheckoutAddressFillResult,
  OrderAssociation,
  OrderAddressInfo,
  PurchaseLookupAutomationInput,
  PurchaseLookupAutomationResult,
  TaobaoPurchaseOrderSnapshot,
  TaobaoRefundAutomationInput,
  TaobaoRefundAutomationResult,
  TaobaoSecurityChallengeSnapshot,
} from '../../shared/types';

export interface TaobaoAutomationDeps {
  getOrderAssociations: (accountId: string) => OrderAssociation[];
  setOrderAssociation: (
    accountId: string,
    orderId: string,
    input: Pick<OrderAssociation, 'internalRemark' | 'linkedOrders'>,
  ) => OrderAssociation;
}

function mergePurchaseAssociation(
  deps: TaobaoAutomationDeps,
  accountId: string,
  orderId: string,
  snapshot: TaobaoPurchaseOrderSnapshot,
): OrderAssociation {
  const existing = deps.getOrderAssociations(accountId).find(item => item.orderId === orderId);
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

  return deps.setOrderAssociation(accountId, orderId, {
    internalRemark: existing?.internalRemark || '',
    linkedOrders: [
      nextLinked,
      ...linkedOrders.filter(item => item.id !== matched?.id && !(item.platform === 'taobao' && item.platformOrderId === platformOrderId)),
    ],
  });
}

export async function runPurchaseLookupAutomation(parent: BrowserWindow, input: PurchaseLookupAutomationInput, deps: TaobaoAutomationDeps): Promise<PurchaseLookupAutomationResult> {
  const url = new URL('https://trade.taobao.com/trade/detail/trade_order_detail.htm');
  url.searchParams.set('biz_order_id', input.platformOrderId);
  const contents = await loadCleanTaobaoPage('baseline', url.toString());
  const challenge = await contents.executeJavaScript(CHALLENGE_SCRIPT) as TaobaoSecurityChallengeSnapshot;
  if (challenge.detected && challenge.kind !== 'unknown') {
    throw new Error(`淘宝页面需要人工处理：${challenge.reason || challenge.kind}`);
  }
  const snapshot = await contents.executeJavaScript(PURCHASE_LOOKUP_SCRIPT) as TaobaoPurchaseOrderSnapshot;
  snapshot.platformOrderId ||= input.platformOrderId;
  if (!snapshot.platformOrderStatus && !snapshot.logisticsStatus && !snapshot.logisticsCompany && !snapshot.trackingNumber) {
    throw new Error('未能从淘宝订单页读取到有效订单状态');
  }
  const association = mergePurchaseAssociation(deps, input.accountId, input.orderId, snapshot);
  return { snapshot, association, challenge };
}

export async function runTaobaoRefundAutomation(parent: BrowserWindow, input: TaobaoRefundAutomationInput): Promise<TaobaoRefundAutomationResult> {
  const url = new URL('https://refund2.taobao.com/dispute/apply.htm');
  url.searchParams.set('bizOrderId', input.platformOrderId);
  url.searchParams.set('type', '1');
  const contents = await loadCleanTaobaoPage('baseline', url.toString());
  const challenge = await contents.executeJavaScript(CHALLENGE_SCRIPT) as TaobaoSecurityChallengeSnapshot;
  if (challenge.detected && challenge.kind !== 'unknown') {
    throw new Error(`淘宝页面需要人工处理：${challenge.reason || challenge.kind}`);
  }
  const snapshot = await contents.executeJavaScript(`${REFUND_PREPARE_SCRIPT}(${JSON.stringify({
    platformOrderId: input.platformOrderId,
    reason: input.reason || '不想要了',
    autoSubmit: !!input.autoSubmit,
  })})`);
  return { snapshot, challenge };
}

export async function fillCurrentTaobaoCheckoutAddress(address: OrderAddressInfo): Promise<CheckoutAddressFillResult> {
  const contents = getCleanBrowserWebContents();
  if (!contents) throw new Error('淘宝浏览器未打开');
  const openResult = await contents.executeJavaScript(OPEN_CHECKOUT_ADDRESS_EDITOR_SCRIPT) as { opened: boolean; reason: string };
  if (!openResult.opened) {
    return { filledFields: [], warnings: [openResult.reason || '未找到新建地址表单'] };
  }

  type FillFrame = { url: string; frames?: FillFrame[]; executeJavaScript: (code: string) => Promise<unknown> };
  const collectFrames = (frame: FillFrame): FillFrame[] => [
    frame,
    ...(frame.frames || []).flatMap(child => collectFrames(child)),
  ];

  let addressFrame: FillFrame | undefined;
  for (let attempt = 0; attempt < 30; attempt++) {
    const frames = collectFrames(contents.mainFrame as unknown as FillFrame);
    addressFrame = frames.find(frame => frame.url.includes('/member/fresh/deliver_address_frame.htm'));
    if (addressFrame) break;
    await sleep(150);
  }
  if (!addressFrame) {
    return { filledFields: [], warnings: ['未找到新建地址表单，请先在淘宝下单页打开或选择“使用新地址”'] };
  }

  return addressFrame.executeJavaScript(`(${ADDRESS_FILL_SCRIPT})(${JSON.stringify(address)})`) as Promise<CheckoutAddressFillResult>;
}
