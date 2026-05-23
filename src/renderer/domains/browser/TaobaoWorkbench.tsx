import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Input, message } from 'antd';
import { ArrowLeftOutlined, ArrowRightOutlined, CloseOutlined, ReloadOutlined } from '@ant-design/icons';
import type { OrderAddressInfo, ShippingAssistantSession } from '../../../shared/types';
import {
  OPEN_SHIPPING_ASSISTANT_EVENT,
  OPEN_TAOBAO_BROWSER_EVENT,
  type OpenShippingAssistantDetail,
  type OpenTaobaoBrowserDetail,
  TAOBAO_BROWSER_PROFILE_ID,
  TAOBAO_HOME_URL,
} from './client';

type TaobaoWebviewElement = HTMLElement & {
  getURL?: () => string;
  getWebContentsId?: () => number;
  canGoBack?: () => boolean;
  canGoForward?: () => boolean;
  goBack?: () => void;
  goForward?: () => void;
  reload?: () => void;
  loadURL?: (url: string) => void;
};

type BrowserState = {
  open: boolean;
  profileId: string;
  url: string;
  currentUrl: string;
  canGoBack: boolean;
  canGoForward: boolean;
  assistantSession: ShippingAssistantSession | null;
};

const initialState: BrowserState = {
  open: false,
  profileId: TAOBAO_BROWSER_PROFILE_ID,
  url: TAOBAO_HOME_URL,
  currentUrl: TAOBAO_HOME_URL,
  canGoBack: false,
  canGoForward: false,
  assistantSession: null,
};

function normalizeBrowserUrl(input: string): string {
  const value = input.trim();
  if (!value) return TAOBAO_HOME_URL;
  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(value)) return value;
  return `https://${value}`;
}

function formatAddress(address?: OrderAddressInfo): string {
  if (!address) return '';
  const phone = address.virtual_number_info?.virtual_number
    ? `虚拟号码：${address.virtual_number_info.virtual_number}${address.virtual_number_info.extension ? ` 转 ${address.virtual_number_info.extension}` : ''}`
    : `电话：${address.purchaser_tel_number || address.tel_number || address.virtual_order_tel_number || '-'}`;
  const detail = [
    address.province_name,
    address.city_name,
    address.county_name,
    address.detail_info,
    address.house_number,
  ].filter(Boolean).join('');
  return [`${address.user_name || '-'} ${phone}`, detail].filter(Boolean).join('\n');
}

function skuText(session: ShippingAssistantSession): string {
  const attrs = session.product.sku_attrs
    ?.map(attr => [attr.attr_key, attr.attr_value].filter(Boolean).join(': '))
    .filter(Boolean)
    .join(' / ');
  return attrs || session.product.sku_code || '无规格';
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

const ShippingAssistantPanel: React.FC<{
  session: ShippingAssistantSession;
  onClose: () => void;
}> = ({ session, onClose }) => {
  const [address, setAddress] = useState<OrderAddressInfo | undefined>(session.address);
  const [loadingAddress, setLoadingAddress] = useState(false);

  const loadAddress = useCallback(async (refresh: boolean) => {
    setLoadingAddress(true);
    try {
      const cache = refresh
        ? await window.wishop.orderRealAddresses.refresh(session.accountId, session.orderId)
        : await window.wishop.orderRealAddresses.fetch(session.accountId, session.orderId);
      setAddress(cache.address);
      message.success(refresh ? '真实地址已刷新' : '真实地址已获取');
    } catch (error) {
      message.error(`获取真实地址失败：${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoadingAddress(false);
    }
  }, [session.accountId, session.orderId]);

  const copyText = useCallback(async (text: string, label: string) => {
    if (!text.trim()) {
      message.warning(`暂无${label}`);
      return;
    }
    await navigator.clipboard.writeText(text);
    message.success(`${label}已复制`);
  }, []);

  const fillAddress = useCallback(async () => {
    if (!address) {
      message.warning('请先获取真实地址');
      return;
    }
    try {
      const result = await window.wishop.taobaoAutomation.fillCheckoutAddress(address);
      message.success(result.filledFields.length ? `已填写：${result.filledFields.join('、')}` : (result.warnings.join('；') || '未填写任何字段'));
    } catch (error) {
      message.error(`自动填写失败：${error instanceof Error ? error.message : String(error)}`);
    }
  }, [address]);

  const addressText = formatAddress(address);
  const orderText = [
    `订单号: ${session.orderId}`,
    `商品: ${session.product.title}`,
    `规格: ${skuText(session)}`,
    `数量: ${session.product.sku_cnt}`,
    session.customerNotes ? `买家备注: ${session.customerNotes}` : '',
    session.merchantNotes ? `商家备注: ${session.merchantNotes}` : '',
    session.source.remark ? `货源备注: ${session.source.remark}` : '',
    addressText ? `地址: ${addressText.replace('\n', ' ')}` : '',
  ].filter(Boolean).join('\n');

  return (
    <aside style={{ width: 360, borderLeft: '1px solid #e8e8e8', background: '#fff', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ height: 44, borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', fontWeight: 600 }}>
        发货助手
        <Button size="small" type="text" icon={<CloseOutlined />} onClick={onClose} />
      </div>
      <div style={{ padding: 12, overflow: 'auto', display: 'grid', gap: 10, fontSize: 13 }}>
        <section style={{ border: '1px solid #f0f0f0', borderRadius: 6, padding: 10, display: 'grid', gap: 6 }}>
          <div><b>微信订单：</b>{session.orderId}</div>
          <div><b>商品：</b>{session.product.title}</div>
          <div><b>规格：</b>{skuText(session)}</div>
          <div><b>数量：</b>x{session.product.sku_cnt}</div>
          <div><b>货源：</b>{session.source.url}</div>
          <div><b>货源备注：</b>{session.source.remark || '-'}</div>
        </section>
        <section style={{ border: '1px solid #f0f0f0', borderRadius: 6, padding: 10, display: 'grid', gap: 8 }}>
          <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{addressText || '未获取真实地址'}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <Button size="small" type="primary" loading={loadingAddress} onClick={() => loadAddress(false)}>获取真实地址</Button>
            <Button size="small" loading={loadingAddress} onClick={() => loadAddress(true)}>刷新</Button>
            <Button size="small" onClick={() => copyText(addressText, '地址')}>复制地址</Button>
            <Button size="small" disabled={!address} onClick={fillAddress}>自动填地址</Button>
          </div>
        </section>
        <section style={{ border: '1px solid #f0f0f0', borderRadius: 6, padding: 10, display: 'grid', gap: 6 }}>
          <div><b>买家备注：</b>{session.customerNotes || '无'}</div>
          <div><b>商家备注：</b>{session.merchantNotes || '无'}</div>
        </section>
        <Button size="small" onClick={() => copyText(orderText, '订单信息')}>复制订单</Button>
      </div>
    </aside>
  );
};

const TaobaoWorkbench: React.FC = () => {
  const [state, setState] = useState<BrowserState>(initialState);
  const webviewRef = useRef<TaobaoWebviewElement | null>(null);
  const registeredWebContentsIdRef = useRef<number | null>(null);
  const pendingReadyRef = useRef<(() => void) | null>(null);
  const pendingErrorRef = useRef<((error: unknown) => void) | null>(null);
  const paidAssociationKeysRef = useRef(new Set<string>());

  const syncState = useCallback(() => {
    const webview = webviewRef.current;
    if (!webview) return;
    let currentUrl = state.currentUrl;
    let canGoBack = false;
    let canGoForward = false;
    try {
      currentUrl = webview.getURL?.() || state.currentUrl;
      canGoBack = !!webview.canGoBack?.();
      canGoForward = !!webview.canGoForward?.();
    } catch {
      return;
    }
    setState(prev => ({
      ...prev,
      currentUrl,
      canGoBack,
      canGoForward,
    }));
    const platformOrderId = readPaySuccessOrderId(currentUrl);
    const session = state.assistantSession;
    if (!platformOrderId || !session) return;
    const key = `${session.accountId}:${session.orderId}:${platformOrderId}`;
    if (paidAssociationKeysRef.current.has(key)) return;
    paidAssociationKeysRef.current.add(key);
    void window.wishop.taobaoAutomation.lookupPurchase({
      accountId: session.accountId,
      orderId: session.orderId,
      platformOrderId,
    }).catch(error => {
      message.warning(`淘宝付款订单已识别，但同步发货状态失败：${error instanceof Error ? error.message : String(error)}`);
    });
  }, [state.assistantSession, state.currentUrl]);

  const registerWebview = useCallback(() => {
    const webview = webviewRef.current;
    if (!webview) return;
    let id: number | undefined;
    try {
      id = webview.getWebContentsId?.();
    } catch (error) {
      pendingErrorRef.current?.(error);
      pendingErrorRef.current = null;
      pendingReadyRef.current = null;
      return;
    }
    if (!id) return;
    if (registeredWebContentsIdRef.current === id) {
      pendingReadyRef.current?.();
      pendingReadyRef.current = null;
      pendingErrorRef.current = null;
      return;
    }
    registeredWebContentsIdRef.current = id;
    void Promise.resolve(window.wishop.browser.registerTaobaoWebContents?.(state.profileId, id))
      .then(() => {
        pendingReadyRef.current?.();
        pendingReadyRef.current = null;
        pendingErrorRef.current = null;
      })
      .catch(error => {
        pendingErrorRef.current?.(error);
        pendingReadyRef.current = null;
        pendingErrorRef.current = null;
      });
  }, [state.profileId]);

  const navigate = useCallback((url: string) => {
    const nextUrl = normalizeBrowserUrl(url);
    setState(prev => ({ ...prev, url: nextUrl, currentUrl: nextUrl }));
    webviewRef.current?.loadURL?.(nextUrl);
  }, []);

  useEffect(() => {
    const openBrowser = (event: Event) => {
      const detail = (event as CustomEvent<OpenTaobaoBrowserDetail>).detail;
      pendingReadyRef.current = detail.onReady || null;
      pendingErrorRef.current = detail.onError || null;
      setState(prev => ({
        ...prev,
        open: true,
        profileId: detail.profileId,
        url: detail.url,
        currentUrl: detail.url,
      }));
      if (registeredWebContentsIdRef.current) {
        window.setTimeout(() => {
          pendingReadyRef.current?.();
          pendingReadyRef.current = null;
          pendingErrorRef.current = null;
        }, 0);
      }
    };
    const openAssistant = (event: Event) => {
      const detail = (event as CustomEvent<OpenShippingAssistantDetail>).detail;
      pendingReadyRef.current = detail.onReady || null;
      pendingErrorRef.current = detail.onError || null;
      setState(prev => ({
        ...prev,
        open: true,
        profileId: detail.profileId,
        url: detail.url,
        currentUrl: detail.url,
        assistantSession: detail.session,
      }));
      if (registeredWebContentsIdRef.current) {
        window.setTimeout(() => {
          pendingReadyRef.current?.();
          pendingReadyRef.current = null;
          pendingErrorRef.current = null;
        }, 0);
      }
    };
    const closeBrowser = () => setState(prev => ({ ...prev, open: false }));
    window.addEventListener(OPEN_TAOBAO_BROWSER_EVENT, openBrowser);
    window.addEventListener(OPEN_SHIPPING_ASSISTANT_EVENT, openAssistant);
    window.addEventListener('wishop:close-taobao-browser', closeBrowser);
    return () => {
      window.removeEventListener(OPEN_TAOBAO_BROWSER_EVENT, openBrowser);
      window.removeEventListener(OPEN_SHIPPING_ASSISTANT_EVENT, openAssistant);
      window.removeEventListener('wishop:close-taobao-browser', closeBrowser);
    };
  }, []);

  useEffect(() => {
    const webview = webviewRef.current;
    if (!state.open || !webview) return;
    const openInSameWebview = (event: Event) => {
      const nextUrl = (event as Event & { url?: string }).url;
      if (!nextUrl) return;
      event.preventDefault();
      navigate(nextUrl);
    };
    webview.addEventListener('dom-ready', registerWebview);
    webview.addEventListener('did-navigate', syncState);
    webview.addEventListener('did-navigate-in-page', syncState);
    webview.addEventListener('did-stop-loading', syncState);
    webview.addEventListener('new-window', openInSameWebview);
    return () => {
      webview.removeEventListener('dom-ready', registerWebview);
      webview.removeEventListener('did-navigate', syncState);
      webview.removeEventListener('did-navigate-in-page', syncState);
      webview.removeEventListener('did-stop-loading', syncState);
      webview.removeEventListener('new-window', openInSameWebview);
    };
  }, [navigate, registerWebview, state.open, syncState]);

  useEffect(() => {
    if (!state.open) return;
    const webview = webviewRef.current;
    if (!webview) return;
    try {
      if (webview.getURL?.() === state.url) return;
      webview.loadURL?.(state.url);
    } catch {
      // The initial src attribute handles navigation before the webview is ready.
    }
  }, [state.open, state.url]);

  useEffect(() => () => {
    const id = registeredWebContentsIdRef.current;
    if (id) void window.wishop.browser.unregisterTaobaoWebContents?.(state.profileId, id);
  }, [state.profileId]);

  if (!state.open) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 20, background: 'rgba(0, 0, 0, 0.32)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: 'min(1320px, calc(100vw - 48px))', height: 'min(860px, calc(100vh - 48px))', minWidth: 760, minHeight: 520, background: '#fff', boxShadow: '0 18px 48px rgba(0, 0, 0, 0.24)', border: '1px solid #d9d9d9', borderRadius: 8, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ height: 46, display: 'flex', alignItems: 'center', gap: 6, padding: '7px 8px', borderBottom: '1px solid #d9d9d9', background: '#f7f8fa' }}>
          <Button size="small" icon={<ArrowLeftOutlined />} disabled={!state.canGoBack} onClick={() => webviewRef.current?.goBack?.()} />
          <Button size="small" icon={<ArrowRightOutlined />} disabled={!state.canGoForward} onClick={() => webviewRef.current?.goForward?.()} />
          <Button size="small" icon={<ReloadOutlined />} onClick={() => webviewRef.current?.reload?.()} />
          <form style={{ flex: 1 }} onSubmit={(event) => {
            event.preventDefault();
            navigate(state.currentUrl);
          }}>
            <Input size="small" value={state.currentUrl} onChange={event => setState(prev => ({ ...prev, currentUrl: event.target.value }))} />
          </form>
          <Button size="small" icon={<CloseOutlined />} onClick={() => setState(prev => ({ ...prev, open: false }))} />
        </div>
        <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
          <webview
            ref={webviewRef as React.RefObject<HTMLElement>}
            src={state.url}
            partition={`persist:taobao-clean-${state.profileId}`}
            allowpopups="true"
            style={{ flex: 1, minWidth: 0, height: '100%' }}
          />
          {state.assistantSession && (
            <ShippingAssistantPanel
              session={state.assistantSession}
              onClose={() => setState(prev => ({ ...prev, assistantSession: null }))}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default TaobaoWorkbench;
