import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Empty, Modal, Select, Table, message } from 'antd';
import { BrowserContext } from '../../components/Layout';
import { useOrderAssociations, useOrders, useProductSources, useRealAddressCaches } from '../../hooks/useIpc';
import type { DeliveryCompanyOption, Order, OrderAssociation, OrderProductInfo, OrderRealAddressCache, OrderSearchParams, OrderAddressInfo, ProductSourceItem, OrderStatus, OrderTimeScope } from '../../../shared/types';
import { OrderStatus as OrderStatusEnum } from '../../../shared/types';
import { formatOrderAddressForCopy } from '../../../shared/address-format';
import { getDeliveryCompanyUnmatchedMessage, isDeliveryCompanyUnmatchedError } from '../../../shared/errors';
import { newProductSourceRow, ShippingSourceModal, SourceManagementModal } from './components/ProductSourceModals';
import { ShippingAssistantDrawer, type ShippingAssistantSession } from './components/ShippingAssistantDrawer';
import { OrderAssociationModal } from './components/OrderAssociationModal';
import { OrderDetailModal } from './components/OrderDetailModal';
import { createOrderColumns } from './components/OrderTableColumns';
import { OrderToolbar } from './components/OrderToolbar';
import { getEstimatedCommissionFee } from './order-display';
import { hasLinkedPurchaseLogistics, isLinkedPurchaseRefundFinished } from './purchase-refund';

function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

async function convertImageBlobToPng(blob: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法读取图片');
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  return new Promise((resolve, reject) => {
    canvas.toBlob(result => {
      if (result) resolve(result);
      else reject(new Error('图片转换失败'));
    }, 'image/png');
  });
}

const Orders: React.FC<{ accountId: string }> = ({ accountId }) => {
  const { orders, hasMore, loading, error, clearError, fetchOrders, fetchOrderDetail, searchOrders } = useOrders(accountId);
  const { openCleanBrowser } = React.useContext(BrowserContext);
  const { productSources, saveProductSources } = useProductSources(accountId);
  const { realAddressCaches, fetchRealAddress } = useRealAddressCaches(accountId);
  const { orderAssociations, fetchAssociations, saveAssociation } = useOrderAssociations(accountId);

  const [activeStatus, setActiveStatus] = useState<OrderStatus | undefined>(undefined);
  const [timeScope, setTimeScope] = useState<OrderTimeScope>('all');
  const [searchType, setSearchType] = useState<OrderSearchParams['search_type']>('order_id');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [decodingOrderIds, setDecodingOrderIds] = useState<Set<string>>(new Set());
  const [associationModalOpen, setAssociationModalOpen] = useState(false);
  const [associationOrder, setAssociationOrder] = useState<Order | null>(null);
  const [associationSaving, setAssociationSaving] = useState(false);
  const [sourceModalOpen, setSourceModalOpen] = useState(false);
  const [sourceProduct, setSourceProduct] = useState<OrderProductInfo | null>(null);
  const [sourceRows, setSourceRows] = useState<ProductSourceItem[]>([]);
  const [sourceSaving, setSourceSaving] = useState(false);
  const [shipSourceModalOpen, setShipSourceModalOpen] = useState(false);
  const [shipSourceOrder, setShipSourceOrder] = useState<Order | null>(null);
  const [shipSourceProduct, setShipSourceProduct] = useState<OrderProductInfo | null>(null);
  const [shippingAssistantOpen, setShippingAssistantOpen] = useState(false);
  const [shippingSession, setShippingSession] = useState<ShippingAssistantSession | null>(null);
  const [checkingPurchaseOrderIds, setCheckingPurchaseOrderIds] = useState<Set<string>>(new Set());
  const [shippingFromPurchaseOrderIds, setShippingFromPurchaseOrderIds] = useState<Set<string>>(new Set());
  const [preparingTaobaoRefundOrderIds, setPreparingTaobaoRefundOrderIds] = useState<Set<string>>(new Set());
  const tableAreaRef = useRef<HTMLDivElement>(null);
  const [scrollY, setScrollY] = useState(400);

  useEffect(() => {
    const el = tableAreaRef.current;
    if (!el) return;
    const measure = () => {
      const h = el.clientHeight;
      if (h > 0) setScrollY(Math.max(100, h - 39));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!accountId) return;
    setActiveStatus(undefined);
    setTimeScope('all');
    setSearchKeyword('');
    setDetailOrder(null);
    void fetchOrders(undefined, false, 'all');
  }, [accountId, fetchOrders]);

  const handleStatusChange = useCallback((val: string | number | null) => {
    if (val === null) return;
    const status = val === 'all' ? undefined : val as OrderStatus;
    setActiveStatus(status);
    setSearchKeyword('');
    fetchOrders(status, false, timeScope);
  }, [fetchOrders, timeScope]);

  const handleTimeScopeChange = useCallback((value: OrderTimeScope) => {
    setTimeScope(value);
    setSearchKeyword('');
    fetchOrders(activeStatus, false, value);
  }, [activeStatus, fetchOrders]);

  const handleSearch = useCallback((value: string) => {
    const keyword = value?.trim();
    if (!keyword) {
      fetchOrders(activeStatus, false, timeScope);
      return;
    }
    searchOrders({ search_type: searchType, keyword });
  }, [activeStatus, fetchOrders, searchOrders, searchType, timeScope]);

  const handleLoadMore = useCallback(() => {
    fetchOrders(activeStatus, true, timeScope);
  }, [activeStatus, fetchOrders, timeScope]);

  const handleViewDetail = useCallback(async (orderId: string) => {
    setDetailModalOpen(true);
    setDetailLoading(true);
    setDetailOrder(null);
    const order = await fetchOrderDetail(orderId);
    setDetailOrder(order);
    setDetailLoading(false);
  }, [fetchOrderDetail]);

  const handleDecodeAddress = useCallback(async (orderId: string) => {
    setDecodingOrderIds(prev => new Set(prev).add(orderId));
    try {
      const cache = await fetchRealAddress(orderId, false);
      if (cache) {
        const text = formatOrderAddressForCopy(cache.address);
        navigator.clipboard.writeText(text).then(() => message.success('真实地址已显示并复制')).catch(() => message.success('真实地址已显示'));
      }
    } catch (err: any) {
      message.error(`获取真实地址失败: ${err.message}`);
    } finally {
      setDecodingOrderIds(prev => { const s = new Set(prev); s.delete(orderId); return s; });
    }
  }, [fetchRealAddress]);

  const handleRefreshAddress = useCallback(async (orderId: string) => {
    setDecodingOrderIds(prev => new Set(prev).add(orderId));
    try {
      await fetchRealAddress(orderId, true);
      message.success('真实地址已刷新');
    } catch (err: any) {
      message.error(`刷新真实地址失败: ${err.message}`);
    } finally {
      setDecodingOrderIds(prev => { const s = new Set(prev); s.delete(orderId); return s; });
    }
  }, [fetchRealAddress]);

  const handleCopyAddress = useCallback((cache: OrderRealAddressCache) => {
    const text = formatOrderAddressForCopy(cache.address);
    navigator.clipboard.writeText(text).then(() => message.success('地址已复制')).catch(() => {});
  }, []);

  const handleCopyText = useCallback((text: string | undefined, label: string) => {
    const value = text?.trim();
    if (!value) {
      message.warning(`暂无${label}`);
      return;
    }
    navigator.clipboard.writeText(value).then(() => message.success(`${label}已复制`)).catch(() => message.error(`复制${label}失败`));
  }, []);

  const handleCopyImage = useCallback(async (imageUrl?: string) => {
    const url = imageUrl?.trim();
    if (!url) {
      message.warning('暂无商品图片');
      return;
    }
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`图片下载失败: ${response.status}`);
      const blob = await response.blob();
      const pngBlob = blob.type === 'image/png' ? blob : await convertImageBlobToPng(blob);
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]);
      message.success('图片已复制');
    } catch {
      await navigator.clipboard.writeText(url);
      message.warning('图片复制受限，已复制图片链接');
    }
  }, []);

  const openSourceManager = useCallback((product: OrderProductInfo) => {
    setSourceProduct(product);
    const sources = (productSources[product.product_id] || []).map(source => ({ ...source }));
    setSourceRows(sources.length > 0 ? sources : [newProductSourceRow()]);
    setSourceModalOpen(true);
  }, [productSources]);

  const handleSaveSources = useCallback(async () => {
    if (!sourceProduct) return;
    setSourceSaving(true);
    try {
      await saveProductSources(sourceProduct.product_id, sourceRows.filter(source => source.url.trim()));
      setSourceModalOpen(false);
      message.success('货源已保存');
    } catch (err: any) {
      message.error(`保存货源失败: ${err.message}`);
    } finally {
      setSourceSaving(false);
    }
  }, [saveProductSources, sourceProduct, sourceRows]);

  const openShipSources = useCallback((order: Order, product: OrderProductInfo) => {
    setShipSourceOrder(order);
    setShipSourceProduct(product);
    setShipSourceModalOpen(true);
  }, []);

  const openAssociationEditor = useCallback((order: Order) => {
    setAssociationOrder(order);
    setAssociationModalOpen(true);
  }, []);

  const handleLookupTaobaoOrder = useCallback((platformOrderId: string) => {
    if (!associationOrder) return;
    Modal.confirm({
      title: '读取淘宝采购单',
      content: '将打开干净淘宝窗口读取采购订单状态、物流公司和快递单号。遇到登录或安全验证时会停止并提示你手动处理。',
      okText: '打开并读取',
      cancelText: '取消',
      async onOk() {
        setCheckingPurchaseOrderIds(previous => new Set(previous).add(associationOrder.order_id));
        try {
          const result = await window.electronAPI.taobaoAutomation.lookupPurchase({
            accountId,
            orderId: associationOrder.order_id,
            platformOrderId,
          });
          await fetchAssociations();
          setAssociationModalOpen(false);
          message.success(`淘宝订单已读取：${result.snapshot.platformOrderStatus || result.snapshot.logisticsStatus || '已回填'}`);
        } catch (err: any) {
          message.error(`淘宝订单读取失败: ${err.message}`);
          throw err;
        } finally {
          setCheckingPurchaseOrderIds(previous => {
            const next = new Set(previous);
            next.delete(associationOrder.order_id);
            return next;
          });
        }
      },
    });
  }, [accountId, associationOrder, fetchAssociations]);

  const handleCheckPurchaseOrder = useCallback(async (order: Order) => {
    const linked = orderAssociations[order.order_id]?.linkedOrders[0];
    const platformOrderId = linked?.platform === 'taobao' ? linked.platformOrderId?.trim() : '';
    if (!platformOrderId) {
      message.warning('当前订单还没有关联淘宝订单号');
      return;
    }
    setCheckingPurchaseOrderIds(previous => new Set(previous).add(order.order_id));
    try {
      const result = await window.electronAPI.taobaoAutomation.lookupPurchase({
        accountId,
        orderId: order.order_id,
        platformOrderId,
      });
      await fetchAssociations();
      message.success(`淘宝订单已读取：${result.snapshot.platformOrderStatus || result.snapshot.logisticsStatus || '已回填'}`);
    } catch (err: any) {
      message.error(`检查淘宝发货状态失败: ${err.message}`);
    } finally {
      setCheckingPurchaseOrderIds(previous => {
        const next = new Set(previous);
        next.delete(order.order_id);
        return next;
      });
    }
  }, [accountId, fetchAssociations, orderAssociations]);

  const handleSaveAssociation = useCallback(async (input: Pick<OrderAssociation, 'internalRemark' | 'linkedOrders'>) => {
    if (!associationOrder) return;
    setAssociationSaving(true);
    try {
      await saveAssociation(associationOrder.order_id, input);
      setAssociationModalOpen(false);
      message.success('采购单详情已保存');
    } catch (err: any) {
      message.error(`保存采购单详情失败: ${err.message}`);
    } finally {
      setAssociationSaving(false);
    }
  }, [associationOrder, saveAssociation]);

  const submitShipFromPurchase = useCallback(async (
    order: Order,
    logisticsCompany: string,
    trackingNumber: string,
    deliveryId?: string,
  ) => {
    setShippingFromPurchaseOrderIds(previous => new Set(previous).add(order.order_id));
    try {
      const result = await window.electronAPI.orders.shipFromPurchase({
        accountId,
        orderId: order.order_id,
        logisticsCompany,
        trackingNumber,
        deliveryId,
      });
      message.success(`微信小店发货已提交：${result.deliveryName} ${result.waybillId}`);
      fetchOrders(activeStatus, false, timeScope);
    } finally {
      setShippingFromPurchaseOrderIds(previous => {
        const next = new Set(previous);
        next.delete(order.order_id);
        return next;
      });
    }
  }, [accountId, activeStatus, fetchOrders, timeScope]);

  const openDeliveryCompanySelector = useCallback(async (
    order: Order,
    logisticsCompany: string,
    trackingNumber: string,
    reason: string,
  ) => {
    let selectedDeliveryId = '';
    let companies: DeliveryCompanyOption[] = [];
    try {
      companies = await window.electronAPI.orders.listDeliveryCompanies(accountId);
    } catch (err: any) {
      message.error(`获取微信小店快递公司列表失败: ${err.message}`);
      return;
    }

    Modal.confirm({
      title: '请选择微信小店快递公司',
      content: (
        <div style={{ display: 'grid', gap: 8 }}>
          <div style={{ fontSize: 13, color: '#595959' }}>{reason}</div>
          <div style={{ fontSize: 13 }}>
            <div>淘宝读取快递公司：{logisticsCompany || '-'}</div>
            <div>淘宝读取快递单号：{trackingNumber || '-'}</div>
          </div>
          <Select
            showSearch
            placeholder="选择微信小店快递公司"
            optionFilterProp="label"
            options={companies.map(company => ({
              value: company.deliveryId,
              label: `${company.deliveryName}（${company.deliveryId}）`,
            }))}
            onChange={(value) => {
              selectedDeliveryId = value;
            }}
            style={{ width: '100%' }}
          />
        </div>
      ),
      okText: '使用所选公司回填',
      cancelText: '取消',
      async onOk() {
        if (!selectedDeliveryId) {
          message.warning('请选择微信小店快递公司');
          throw new Error('请选择微信小店快递公司');
        }
        try {
          await submitShipFromPurchase(order, logisticsCompany, trackingNumber, selectedDeliveryId);
        } catch (err: any) {
          message.error(`回填微信小店发货失败: ${err.message}`);
          throw err;
        }
      },
    });
  }, [accountId, submitShipFromPurchase]);

  const handleShipFromPurchase = useCallback((order: Order) => {
    const linked = orderAssociations[order.order_id]?.linkedOrders[0];
    const logisticsCompany = linked?.logisticsCompany?.trim() || '';
    const trackingNumber = linked?.trackingNumber?.trim() || '';
    if (!logisticsCompany || !trackingNumber) {
      message.warning('请先检查发货状态，读取快递公司和快递单号');
      return;
    }
    Modal.confirm({
      title: '回填微信小店发货',
      content: `确认将 ${logisticsCompany} ${trackingNumber} 回填到微信小店订单 ${order.order_id}？`,
      okText: '确认回填',
      cancelText: '取消',
      async onOk() {
        try {
          await submitShipFromPurchase(order, logisticsCompany, trackingNumber);
        } catch (err: any) {
          if (isDeliveryCompanyUnmatchedError(err)) {
            await openDeliveryCompanySelector(
              order,
              logisticsCompany,
              trackingNumber,
              getDeliveryCompanyUnmatchedMessage(err),
            );
            return;
          }
          message.error(`回填微信小店发货失败: ${err.message}`);
          throw err;
        }
      },
    });
  }, [openDeliveryCompanySelector, orderAssociations, submitShipFromPurchase]);

  const handlePrepareTaobaoRefund = useCallback((order: Order) => {
    const linked = orderAssociations[order.order_id]?.linkedOrders[0];
    const platformOrderId = linked?.platform === 'taobao' ? linked.platformOrderId?.trim() : '';
    if (!platformOrderId) {
      message.warning('当前订单还没有关联淘宝订单号');
      return;
    }
    if (order.status !== OrderStatusEnum.CancelledByAfterSale) {
      message.warning('仅售后取消订单需要申请淘宝退款');
      return;
    }
    if (isLinkedPurchaseRefundFinished(linked)) {
      message.info('淘宝采购单已显示退款结束或交易关闭，无需重复申请退款');
      return;
    }
    const hasLogistics = hasLinkedPurchaseLogistics(linked);
    Modal.confirm({
      title: hasLogistics ? '打开淘宝退款申请页' : '自动提交淘宝退款申请',
      content: hasLogistics
        ? '当前采购单已有物流信息。将打开退款页并自动选择“不想要了”，不会自动提交，请人工确认。'
        : '当前采购单未读取到物流信息。将打开退款页、选择“不想要了”，并自动点击淘宝提交。',
      okText: hasLogistics ? '打开并选择原因' : '自动提交退款',
      cancelText: '取消',
      onOk: async () => {
        setPreparingTaobaoRefundOrderIds(prev => new Set(prev).add(order.order_id));
        try {
          const result = await window.electronAPI.taobaoAutomation.prepareRefund({
            accountId,
            orderId: order.order_id,
            platformOrderId,
            reason: '不想要了',
            autoSubmit: !hasLogistics,
          });
          message.success(result.snapshot.autoSubmitted ? '淘宝退款申请已自动提交' : '淘宝退款原因已选择，请人工确认提交');
          if (result.snapshot.autoSubmitted) {
            void handleCheckPurchaseOrder(order);
          }
        } catch (err: any) {
          message.error(`淘宝退款申请准备失败: ${err.message}`);
          throw err;
        } finally {
          setPreparingTaobaoRefundOrderIds(prev => {
            const next = new Set(prev);
            next.delete(order.order_id);
            return next;
          });
        }
      },
    });
  }, [accountId, handleCheckPurchaseOrder, orderAssociations]);

  const handleOpenShippingSession = useCallback(async (source: ProductSourceItem) => {
    if (!shipSourceOrder || !shipSourceProduct) return;
    const address = realAddressCaches[shipSourceOrder.order_id]?.address;
    const url = normalizeUrl(source.url);
    await openCleanBrowser('baseline', url);
    setShippingSession({
      accountId,
      orderId: shipSourceOrder.order_id,
      product: shipSourceProduct,
      source: { ...source, url },
      address,
      merchantNotes: shipSourceOrder.order_detail?.ext_info?.merchant_notes,
      customerNotes: shipSourceOrder.order_detail?.ext_info?.customer_notes,
      createTime: shipSourceOrder.create_time,
      payTime: shipSourceOrder.order_detail?.pay_info?.pay_time,
      orderPrice: shipSourceOrder.order_detail?.price_info?.order_price,
    });
    setShippingAssistantOpen(true);
    setShipSourceModalOpen(false);
    message.success(address ? '已打开淘宝发货页' : '已打开淘宝发货页，真实地址需手动获取');
  }, [accountId, openCleanBrowser, realAddressCaches, shipSourceOrder, shipSourceProduct]);

  const handleFillCheckoutAddress = useCallback(async (address: OrderAddressInfo) => {
    return window.electronAPI.taobaoAutomation.fillCheckoutAddress(address);
  }, []);

  const columns = useMemo(() => createOrderColumns({
    realAddressCaches,
    decodingOrderIds,
    productSources,
    orderAssociations,
    checkingPurchaseOrderIds,
    shippingFromPurchaseOrderIds,
    preparingTaobaoRefundOrderIds,
    onCopyText: handleCopyText,
    onCopyImage: handleCopyImage,
    onCopyAddress: handleCopyAddress,
    onDecodeAddress: handleDecodeAddress,
    onRefreshAddress: handleRefreshAddress,
    onViewDetail: handleViewDetail,
    onOpenSourceManager: openSourceManager,
    onOpenShipSources: openShipSources,
    onEditAssociation: openAssociationEditor,
    onCheckPurchaseOrder: handleCheckPurchaseOrder,
    onShipFromPurchase: handleShipFromPurchase,
    onPrepareTaobaoRefund: handlePrepareTaobaoRefund,
  }), [
    realAddressCaches,
    decodingOrderIds,
    productSources,
    orderAssociations,
    checkingPurchaseOrderIds,
    shippingFromPurchaseOrderIds,
    preparingTaobaoRefundOrderIds,
    handleCopyText,
    handleCopyImage,
    handleCopyAddress,
    handleDecodeAddress,
    handleRefreshAddress,
    handleViewDetail,
    openSourceManager,
    openShipSources,
    openAssociationEditor,
    handleCheckPurchaseOrder,
    handleShipFromPurchase,
    handlePrepareTaobaoRefund,
  ]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <OrderToolbar
        activeStatus={activeStatus}
        timeScope={timeScope}
        searchActive={!!searchKeyword.trim()}
        searchType={searchType}
        searchKeyword={searchKeyword}
        loading={loading}
        error={error}
        onStatusChange={handleStatusChange}
        onTimeScopeChange={handleTimeScopeChange}
        onSearchTypeChange={setSearchType}
        onSearchKeywordChange={setSearchKeyword}
        onSearch={handleSearch}
        onRefresh={() => fetchOrders(activeStatus, false, timeScope)}
        onClearError={clearError}
      />

      <div ref={tableAreaRef} style={{ flex: 1, minHeight: 0 }}>
        <Table
          dataSource={orders}
          columns={columns}
          rowKey="order_id"
          size="small"
          loading={loading}
          pagination={false}
          scroll={{ x: 1050, y: scrollY }}
          styles={{
            content: { height: '100%', display: 'flex', flexDirection: 'column' },
            section: { flex: 1 },
          }}
          locale={{ emptyText: <Empty description="暂无订单" /> }}
          footer={() => {
            if (loading) return null;
            if (hasMore) {
              return (
                <div style={{ textAlign: 'center', padding: '8px 0' }}>
                  <Button size="small" loading={loading} onClick={handleLoadMore}>加载更多</Button>
                </div>
              );
            }
            if (orders.length === 0) return null;
            return <div style={{ textAlign: 'center', color: '#bbb', fontSize: 12, padding: '8px 0' }}>— 没有更多订单 —</div>;
          }}
        />
      </div>

      <OrderDetailModal
        open={detailModalOpen}
        loading={detailLoading}
        order={detailOrder}
        realAddressCache={detailOrder ? realAddressCaches[detailOrder.order_id] : undefined}
        onCancel={() => setDetailModalOpen(false)}
      />

      <SourceManagementModal
        open={sourceModalOpen}
        product={sourceProduct}
        rows={sourceRows}
        saving={sourceSaving}
        onRowsChange={setSourceRows}
        onCancel={() => setSourceModalOpen(false)}
        onSave={handleSaveSources}
      />

      <ShippingSourceModal
        open={shipSourceModalOpen}
        product={shipSourceProduct}
        sources={shipSourceProduct ? productSources[shipSourceProduct.product_id] || [] : []}
        onCancel={() => setShipSourceModalOpen(false)}
        onOpenShipping={handleOpenShippingSession}
      />

      <ShippingAssistantDrawer
        open={shippingAssistantOpen}
        session={shippingSession}
        addressCache={shippingSession ? realAddressCaches[shippingSession.orderId] : undefined}
        onClose={() => setShippingAssistantOpen(false)}
        onFetchAddress={fetchRealAddress}
        onFillCheckoutAddress={handleFillCheckoutAddress}
      />

      <OrderAssociationModal
        open={associationModalOpen}
        association={associationOrder ? orderAssociations[associationOrder.order_id] : undefined}
        saving={associationSaving}
        onCancel={() => setAssociationModalOpen(false)}
        onSave={handleSaveAssociation}
        onOpenTaobaoOrder={handleLookupTaobaoOrder}
      />
    </div>
  );
};

export default React.memo(Orders);
