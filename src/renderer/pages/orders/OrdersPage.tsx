import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Table, Tag, Button, Modal, Descriptions, Image, Spin, Empty, Flex, Space, Typography, message } from 'antd';
import { LinkOutlined, EyeOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { useOrderAssociations, useOrders, useProductSources, useRealAddressCaches } from '../../hooks/useIpc';
import { BrowserContext } from '../../components/Layout';
import type { Order, OrderStatus, OrderProductInfo, OrderSearchParams, OrderAddressInfo, ProductSourceItem, OrderAssociation, OrderTimeScope } from '../../../shared/types';
import { OrderStatus as OrderStatusEnum } from '../../../shared/types';
import { formatOrderAddressForCopy, formatOrderAddressLine, getOrderPhoneDisplay } from '../../../shared/address-format';
import { SourceManagementModal, ShippingSourceModal, newProductSourceRow } from './components/ProductSourceModals';
import { ShippingAssistantDrawer, type ShippingAssistantSession } from './components/ShippingAssistantDrawer';
import { OrderAssociationModal } from './components/OrderAssociationModal';
import { OrderToolbar } from './components/OrderToolbar';
import { hasLinkedPurchaseLogistics, isLinkedPurchaseRefundFinished } from './purchase-refund';

const { Text } = Typography;

const STATUS_CONFIG: Record<number, { color: string; text: string }> = {
  [OrderStatusEnum.PendingPayment]: { color: 'orange', text: '待付款' },
  [OrderStatusEnum.GiftPendingAccept]: { color: 'purple', text: '礼物待收下' },
  [OrderStatusEnum.GroupBuying]: { color: 'cyan', text: '凑单中' },
  [OrderStatusEnum.PendingShipment]: { color: 'blue', text: '待发货' },
  [OrderStatusEnum.PartialShipment]: { color: 'geekblue', text: '部分发货' },
  [OrderStatusEnum.PendingReceipt]: { color: 'cyan', text: '待收货' },
  [OrderStatusEnum.Completed]: { color: 'green', text: '已完成' },
  [OrderStatusEnum.CancelledByAfterSale]: { color: 'red', text: '售后取消' },
  [OrderStatusEnum.CancelledByUser]: { color: 'default', text: '已取消' },
};

const PAYMENT_METHOD: Record<number, string> = {
  1: '微信支付',
  2: '先用后付',
  3: '0元抽奖',
  4: '积分兑换',
};

const STATUS_FILTER_OPTIONS = [
  { label: '全部', value: 'all' },
  { label: '待付款', value: OrderStatusEnum.PendingPayment },
  { label: '待发货', value: OrderStatusEnum.PendingShipment },
  { label: '已发货', value: OrderStatusEnum.PendingReceipt },
  { label: '已完成', value: OrderStatusEnum.Completed },
];

const SEARCH_TYPE_OPTIONS = [
  { value: 'order_id', label: '订单号' },
  { value: 'title', label: '商品标题' },
  { value: 'user_name', label: '收件人' },
  { value: 'merchant_notes', label: '商家备注' },
  { value: 'customer_notes', label: '买家备注' },
];

function formatTime(timestamp: number): string {
  if (!timestamp) return '-';
  const d = new Date(timestamp * 1000);
  return d.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatPrice(cents: number): string {
  if (cents === undefined || cents === null) return '-';
  return `¥${(cents / 100).toFixed(2)}`;
}

const firstProduct = (order: Order): OrderProductInfo | undefined =>
  order.order_detail?.product_infos?.[0];

const canDecodeAddress = (status: OrderStatus): boolean =>
  [OrderStatusEnum.PendingShipment, OrderStatusEnum.PartialShipment, OrderStatusEnum.PendingReceipt].includes(status);

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
  const [decodedAddresses, setDecodedAddresses] = useState<Record<string, OrderAddressInfo>>({});
  const [decodingOrderIds, setDecodingOrderIds] = useState<Set<string>>(new Set());
  const [sourceModalOpen, setSourceModalOpen] = useState(false);
  const [sourceProduct, setSourceProduct] = useState<OrderProductInfo | null>(null);
  const [sourceRows, setSourceRows] = useState<ProductSourceItem[]>([]);
  const [sourceSaving, setSourceSaving] = useState(false);
  const [shipSourceModalOpen, setShipSourceModalOpen] = useState(false);
  const [shipSourceOrder, setShipSourceOrder] = useState<Order | null>(null);
  const [shipSourceProduct, setShipSourceProduct] = useState<OrderProductInfo | null>(null);
  const [shippingAssistantOpen, setShippingAssistantOpen] = useState(false);
  const [shippingSession, setShippingSession] = useState<ShippingAssistantSession | null>(null);
  const [associationModalOpen, setAssociationModalOpen] = useState(false);
  const [associationOrder, setAssociationOrder] = useState<Order | null>(null);
  const [associationSaving, setAssociationSaving] = useState(false);
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
    if (accountId) {
      setActiveStatus(undefined);
      setTimeScope('all');
      fetchOrders(undefined, false, 'all');
    }
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
    if (!value?.trim()) {
      fetchOrders(activeStatus, false, timeScope);
      return;
    }
    searchOrders({ search_type: searchType, keyword: value.trim() });
  }, [activeStatus, timeScope, searchType, fetchOrders, searchOrders]);

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
      if (cache?.address) {
        setDecodedAddresses(prev => ({ ...prev, [orderId]: cache.address }));
        const text = formatOrderAddressForCopy(cache.address);
        navigator.clipboard.writeText(text).then(() => message.success('真实地址已显示并复制')).catch(() => message.success('真实地址已显示'));
      }
    } catch (err: any) {
      message.error(`获取真实地址失败: ${err.message}`);
    } finally {
      setDecodingOrderIds(prev => { const s = new Set(prev); s.delete(orderId); return s; });
    }
  }, [fetchRealAddress]);

  const handleCopyAddress = useCallback((addr: OrderAddressInfo) => {
    const text = formatOrderAddressForCopy(addr);
    navigator.clipboard.writeText(text).then(() => message.success('地址已复制')).catch(() => {});
  }, []);

  const normalizeUrl = useCallback((url: string): string => {
    const trimmed = url.trim();
    if (!trimmed) return trimmed;
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  }, []);

  const openSourceManager = useCallback((product: OrderProductInfo) => {
    setSourceProduct(product);
    const sources = (productSources[product.product_id] || []).map(source => ({ ...source }));
    setSourceRows(sources.length > 0 ? sources : [newProductSourceRow()]);
    setSourceModalOpen(true);
  }, [productSources]);

  const saveSources = useCallback(async () => {
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

  const openShippingSession = useCallback(async (source: ProductSourceItem) => {
    if (!shipSourceOrder || !shipSourceProduct) return;
    const address = realAddressCaches[shipSourceOrder.order_id]?.address || decodedAddresses[shipSourceOrder.order_id];
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
    message.success(address ? '已打开淘宝货源页' : '已打开淘宝货源页，真实地址可在发货助手中获取');
  }, [accountId, decodedAddresses, normalizeUrl, openCleanBrowser, realAddressCaches, shipSourceOrder, shipSourceProduct]);

  const openAssociationEditor = useCallback((order: Order) => {
    setAssociationOrder(order);
    setAssociationModalOpen(true);
  }, []);

  const openTaobaoOrder = useCallback((platformOrderId: string) => {
    const trimmed = platformOrderId.trim();
    if (!trimmed) return;
    const url = new URL('https://trade.taobao.com/trade/detail/trade_order_detail.htm');
    url.searchParams.set('biz_order_id', trimmed);
    void openCleanBrowser('baseline', url.toString());
  }, [openCleanBrowser]);

  const handleCheckPurchaseOrder = useCallback(async (order: Order) => {
    const linked = orderAssociations[order.order_id]?.linkedOrders[0];
    const platformOrderId = linked?.platform === 'taobao' ? linked.platformOrderId?.trim() : '';
    if (!platformOrderId) {
      message.warning('当前订单还没有关联淘宝订单号');
      return;
    }
    setCheckingPurchaseOrderIds(prev => new Set(prev).add(order.order_id));
    try {
      const result = await window.electronAPI.taobaoAutomation.lookupPurchase({
        accountId,
        orderId: order.order_id,
        platformOrderId,
      });
      await fetchAssociations();
      message.success(`淘宝订单已读取：${result.snapshot.platformOrderStatus || result.snapshot.logisticsStatus || '已回填'}`);
    } catch (err: any) {
      message.error(`读取淘宝订单失败: ${err.message}`);
    } finally {
      setCheckingPurchaseOrderIds(prev => {
        const next = new Set(prev);
        next.delete(order.order_id);
        return next;
      });
    }
  }, [accountId, fetchAssociations, orderAssociations]);

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
      title: hasLogistics ? '准备淘宝退款申请' : '自动提交淘宝退款申请',
      content: hasLogistics
        ? '当前采购单已有物流信息。将打开退款页并自动选择“不想要了”，不会自动提交。'
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

  const handleFillCheckoutAddress = useCallback(async (address: OrderAddressInfo) => {
    return window.electronAPI.taobaoAutomation.fillCheckoutAddress(address);
  }, []);

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

  const shipFromPurchase = useCallback(async (order: Order) => {
    const linked = orderAssociations[order.order_id]?.linkedOrders[0];
    if (!linked?.logisticsCompany || !linked?.trackingNumber) {
      message.warning('采购单缺少快递公司或快递单号');
      return;
    }
    setShippingFromPurchaseOrderIds(prev => new Set(prev).add(order.order_id));
    try {
      await window.electronAPI.orders.shipFromPurchase({
        accountId,
        orderId: order.order_id,
        logisticsCompany: linked.logisticsCompany,
        trackingNumber: linked.trackingNumber,
      });
      message.success('微信小店发货已回填');
      fetchOrders(activeStatus, false, timeScope);
    } catch (err: any) {
      message.error(`回填发货失败: ${err.message}`);
    } finally {
      setShippingFromPurchaseOrderIds(prev => {
        const next = new Set(prev);
        next.delete(order.order_id);
        return next;
      });
    }
  }, [accountId, activeStatus, fetchOrders, orderAssociations, timeScope]);

  const columns = [
    {
      title: '订单信息',
      key: 'order_info',
      width: 280,
      render: (_: unknown, record: Order) => {
        const product = firstProduct(record);
        return (
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            {product?.thumb_img && (
              <Image src={product.thumb_img} width={50} height={50} alt={product.title || '商品图片'} style={{ borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} preview={false} />
            )}
            <div style={{ minWidth: 0, flex: 1 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>{record.order_id}</Text>
              <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product?.title || '-'}</div>
              {product?.sku_code && <Text type="secondary" style={{ fontSize: 12 }}>编码: {product.sku_code}</Text>}
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>下单: {formatTime(record.create_time)}</Text>
            </div>
          </div>
        );
      },
    },
    {
      title: '规格/数量',
      key: 'sku',
      width: 140,
      render: (_: unknown, record: Order) => {
        const product = firstProduct(record);
        if (!product) return '-';
        const specs = product.sku_attrs?.map(a => a.attr_value).join(', ') || '-';
        return (
          <div>
            <div style={{ fontSize: 12, color: '#333' }}>{specs}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>x{product.sku_cnt}</Text>
          </div>
        );
      },
    },
    {
      title: '实付款',
      key: 'price',
      width: 130,
      render: (_: unknown, record: Order) => {
        const pi = record.order_detail?.price_info;
        if (!pi) return '-';
        return (
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{formatPrice(pi.order_price)}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>商品 {formatPrice(pi.product_price)}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>运费 {formatPrice(pi.freight)}</Text>
            {pi.discounted_price > 0 && (
              <>
                <br />
                <Text type="danger" style={{ fontSize: 12 }}>优惠 -{formatPrice(pi.discounted_price)}</Text>
              </>
            )}
          </div>
        );
      },
    },
    {
      title: '订单状态',
      key: 'status',
      width: 170,
      render: (_: unknown, record: Order) => {
        const cfg = STATUS_CONFIG[record.status] || { color: 'default', text: `未知(${record.status})` };
        const payInfo = record.order_detail?.pay_info;
        const deliveryInfos = record.order_detail?.delivery_info?.delivery_product_info;
        const product = firstProduct(record);

        return (
          <div>
            <Tag color={cfg.color} style={{ marginBottom: 4 }}>{cfg.text}</Tag>
            {payInfo?.payment_method && (
              <Text type="secondary" style={{ fontSize: 12 }}>{PAYMENT_METHOD[payInfo.payment_method] || `支付方式${payInfo.payment_method}`}</Text>
            )}
            {record.status === OrderStatusEnum.PendingShipment && product?.delivery_deadline && (
              <div style={{ fontSize: 12, color: '#fa8c16' }}>
                发货时限: {formatTime(product.delivery_deadline)}
              </div>
            )}
            {(record.status === OrderStatusEnum.PendingReceipt || record.status === OrderStatusEnum.Completed) && deliveryInfos?.length > 0 && (
              <>
                {deliveryInfos.map((d, i) => (
                  <div key={i} style={{ borderTop: i > 0 ? '1px dashed #f0f0f0' : undefined, paddingTop: i > 0 ? 4 : 0, marginTop: i > 0 ? 4 : 0 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>{d.delivery_name || d.delivery_id}</Text>
                    <div style={{ fontSize: 12, color: '#333' }}>{d.waybill_id}</div>
                    {d.delivery_time > 0 && <Text type="secondary" style={{ fontSize: 12 }}>发货: {formatTime(d.delivery_time)}</Text>}
                  </div>
                ))}
              </>
            )}
          </div>
        );
      },
    },
    {
      title: '收货地址',
      key: 'address',
      width: 180,
      render: (_: unknown, record: Order) => {
        const masked = record.order_detail?.delivery_info?.address_info;
        const real = realAddressCaches[record.order_id]?.address || decodedAddresses[record.order_id];
        const addr = real || masked;
        if (!addr) return '-';
        const fullAddr = formatOrderAddressLine(addr);
        const phone = getOrderPhoneDisplay(addr);
        const isDecoded = !!real;
        const isDecoding = decodingOrderIds.has(record.order_id);
        return (
          <div>
            <div style={{ fontSize: 12, color: '#333' }}>{addr.user_name}</div>
            <div style={{ fontSize: 12, color: phone.isVirtual ? '#1677ff' : '#333' }}>
              {phone.label}: {phone.value || '-'}
            </div>
            <Text type="secondary" style={{ fontSize: 12 }} title={fullAddr}>
              {fullAddr.length > 25 ? fullAddr.substring(0, 25) + '...' : fullAddr}
            </Text>
            {!isDecoded && canDecodeAddress(record.status) && (
              <Button type="link" size="small" loading={isDecoding} onClick={() => handleDecodeAddress(record.order_id)} style={{ padding: 0, height: 'auto', fontSize: 12 }}>
                查看真实地址
              </Button>
            )}
            {isDecoded && (
              <Button type="link" size="small" onClick={() => handleCopyAddress(real!)} style={{ padding: 0, height: 'auto', fontSize: 12 }}>
                复制地址
              </Button>
            )}
          </div>
        );
      },
    },
    {
      title: '备注',
      key: 'notes',
      width: 140,
      render: (_: unknown, record: Order) => {
        const ext = record.order_detail?.ext_info;
        if (!ext) return <Text type="secondary">无</Text>;
        const hasCustomer = ext.customer_notes && ext.customer_notes.trim();
        const hasMerchant = ext.merchant_notes && ext.merchant_notes.trim();
        if (!hasCustomer && !hasMerchant) return <Text type="secondary">无</Text>;
        return (
          <div>
            {hasCustomer && (
              <div>
                <Text type="secondary" style={{ fontSize: 11 }}>买家: </Text>
                <Text style={{ fontSize: 12 }} title={ext.customer_notes}>
                  {ext.customer_notes!.length > 15 ? ext.customer_notes!.substring(0, 15) + '...' : ext.customer_notes}
                </Text>
              </div>
            )}
            {hasMerchant && (
              <div>
                <Text type="secondary" style={{ fontSize: 11 }}>商家: </Text>
                <Text style={{ fontSize: 12, color: '#1890ff' }} title={ext.merchant_notes}>
                  {ext.merchant_notes!.length > 15 ? ext.merchant_notes!.substring(0, 15) + '...' : ext.merchant_notes}
                </Text>
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: '采购单',
      key: 'purchase',
      width: 190,
      render: (_: unknown, record: Order) => {
        const association = orderAssociations[record.order_id];
        const linked = association?.linkedOrders[0];
        const internalRemark = association?.internalRemark?.trim();
        const canShipFromPurchase = record.status === OrderStatusEnum.PendingShipment
          && !!linked?.trackingNumber
          && !!linked?.logisticsCompany
          && !record.order_detail?.delivery_info?.delivery_product_info?.length;
        const canOpenTaobaoRefund = record.status === OrderStatusEnum.CancelledByAfterSale
          && linked?.platform === 'taobao'
          && !!linked.platformOrderId;
        return (
          <div style={{ display: 'grid', gap: 3 }}>
            {internalRemark && (
              <Text style={{ fontSize: 12, color: '#cf1322' }} title={internalRemark}>
                备注: {internalRemark.length > 22 ? `${internalRemark.substring(0, 22)}...` : internalRemark}
              </Text>
            )}
            {linked ? (
              <>
                <Text style={{ fontSize: 12, color: '#0958d9' }} title={linked.platformOrderId}>
                  {linked.platform === 'taobao' ? '淘宝' : linked.platform}: {linked.platformOrderId || '-'}
                </Text>
                {linked.platformOrderStatus && (
                  <Text type="secondary" style={{ fontSize: 12 }}>状态: {linked.platformOrderStatus}</Text>
                )}
                {linked.logisticsStatus && (
                  <Text type="secondary" style={{ fontSize: 12 }}>物流: {linked.logisticsStatus}</Text>
                )}
                {linked.trackingNumber && (
                  <Text type="secondary" style={{ fontSize: 12 }} title={linked.trackingNumber}>
                    单号: {linked.trackingNumber.length > 18 ? `${linked.trackingNumber.substring(0, 18)}...` : linked.trackingNumber}
                  </Text>
                )}
                {linked.platform === 'taobao' && linked.platformOrderId && (
                  <>
                    <Button type="link" size="small" onClick={() => openTaobaoOrder(linked.platformOrderId)} style={{ padding: 0, height: 18, fontSize: 12, justifySelf: 'start' }}>
                      打开淘宝订单
                    </Button>
                    <Button
                      type="link"
                      size="small"
                      loading={checkingPurchaseOrderIds.has(record.order_id)}
                      onClick={() => handleCheckPurchaseOrder(record)}
                      style={{ padding: 0, height: 18, fontSize: 12, justifySelf: 'start' }}
                    >
                      检查发货状态
                    </Button>
                  </>
                )}
                {canOpenTaobaoRefund && (
                  <Button
                    type="link"
                    size="small"
                    danger
                    loading={preparingTaobaoRefundOrderIds.has(record.order_id)}
                    onClick={() => handlePrepareTaobaoRefund(record)}
                    style={{ padding: 0, height: 18, fontSize: 12, justifySelf: 'start' }}
                  >
                    申请退款
                  </Button>
                )}
                {linked.trackingNumber && (
                  <Button
                    type="link"
                    size="small"
                    disabled={!canShipFromPurchase}
                    loading={shippingFromPurchaseOrderIds.has(record.order_id)}
                    onClick={() => shipFromPurchase(record)}
                    title={!canShipFromPurchase ? '仅待发货订单且已填写快递公司和快递单号时可回填' : undefined}
                    style={{ padding: 0, height: 18, fontSize: 12, justifySelf: 'start' }}
                  >
                    回填发货
                  </Button>
                )}
              </>
            ) : (
              !internalRemark && <Text type="secondary" style={{ fontSize: 12 }}>未关联采购单</Text>
            )}
            <Button type="link" size="small" onClick={() => openAssociationEditor(record)} style={{ padding: 0, height: 18, fontSize: 12, justifySelf: 'start' }}>
              {association ? '编辑采购单' : '添加采购单'}
            </Button>
          </div>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 110,
      render: (_: unknown, record: Order) => {
        const product = firstProduct(record);
        const sources = product?.product_id ? productSources[product.product_id] || [] : [];
        return (
          <Flex vertical align="flex-start">
            <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record.order_id)}>
              详情
            </Button>
            <Button
              type="link"
              size="small"
              icon={<LinkOutlined />}
              disabled={!product?.product_id}
              onClick={() => product && openSourceManager(product)}
            >
              管理货源
            </Button>
            {record.status === OrderStatusEnum.PendingShipment && product?.product_id && sources.length > 0 && (
              <Button type="link" size="small" icon={<ShoppingCartOutlined />} onClick={() => openShipSources(record, product)}>
                去发货
              </Button>
            )}
          </Flex>
        );
      },
    },
  ];

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
          scroll={{ x: 1290, y: scrollY }}
          styles={{
            content: { height: '100%', display: 'flex', flexDirection: 'column' },
            section: { flex: 1 },
          }}
          locale={{ emptyText: <Empty description="暂无订单" /> }}
          footer={() => {
            if (loading || orders.length === 0) return null;
            if (hasMore) {
              return (
                <div style={{ textAlign: 'center', padding: '8px 0' }}>
                  <Button size="small" loading={loading} onClick={handleLoadMore}>加载更多</Button>
                </div>
              );
            }
            return <div style={{ textAlign: 'center', color: '#bbb', fontSize: 12, padding: '8px 0' }}>— 没有更多订单 —</div>;
          }}
        />
      </div>

      <Modal
        title="订单详情"
        open={detailModalOpen}
        onCancel={() => setDetailModalOpen(false)}
        footer={null}
        width={720}
        destroyOnHidden
      >
        {detailLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
        ) : detailOrder ? (
          <Flex vertical gap={16}>
            <Descriptions
              size="small"
              column={2}
              bordered
              items={[
                { key: 'orderId', label: '订单号', children: detailOrder.order_id },
                {
                  key: 'status',
                  label: '状态',
                  children: <Tag color={(STATUS_CONFIG[detailOrder.status] || {}).color}>{(STATUS_CONFIG[detailOrder.status] || { text: `未知(${detailOrder.status})` }).text}</Tag>,
                },
                { key: 'createTime', label: '下单时间', children: formatTime(detailOrder.create_time) },
                { key: 'updateTime', label: '更新时间', children: formatTime(detailOrder.update_time) },
              ]}
            />

            {detailOrder.order_detail?.product_infos && (
              <div>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>商品信息</div>
                {detailOrder.order_detail.product_infos.map((p, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, padding: '8px 0', borderBottom: '1px solid #f0f0f0', alignItems: 'center' }}>
                    {p.thumb_img && <Image src={p.thumb_img} width={50} height={50} alt={p.title || '商品图片'} style={{ borderRadius: 4, objectFit: 'cover' }} preview={false} />}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</div>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {p.sku_attrs?.map(a => `${a.attr_key}: ${a.attr_value}`).join(' / ')}
                      </Text>
                      <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                        <Flex gap={16}>
                          <span>数量: {p.sku_cnt}</span>
                          <span>单价: {formatPrice(p.sale_price)}</span>
                          <span>实付: {formatPrice(p.real_price)}</span>
                        </Flex>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {detailOrder.order_detail?.price_info && (
              <Descriptions
                size="small"
                column={2}
                bordered
                title="价格信息"
                items={[
                  { key: 'productPrice', label: '商品总价', children: formatPrice(detailOrder.order_detail.price_info.product_price) },
                  { key: 'orderPrice', label: '实付金额', children: formatPrice(detailOrder.order_detail.price_info.order_price) },
                  { key: 'freight', label: '运费', children: formatPrice(detailOrder.order_detail.price_info.freight) },
                  { key: 'discount', label: '优惠', children: formatPrice(detailOrder.order_detail.price_info.discounted_price) },
                  { key: 'merchantReceive', label: '商家实收', children: formatPrice(detailOrder.order_detail.price_info.merchant_receieve_price), span: 2 },
                ]}
              />
            )}

            {detailOrder.order_detail?.delivery_info?.address_info && (
              (() => {
                const address = detailOrder.order_detail.delivery_info.address_info;
                const phone = getOrderPhoneDisplay(address);
                return (
                  <Descriptions
                    size="small"
                    column={1}
                    bordered
                    title="收货信息"
                    items={[
                      { key: 'userName', label: '收货人', children: address.user_name },
                      { key: 'telNumber', label: phone.label, children: phone.value || '-' },
                      { key: 'address', label: '地址', children: formatOrderAddressLine(address) },
                    ]}
                  />
                );
              })()
            )}

            {detailOrder.order_detail?.delivery_info?.delivery_product_info?.length > 0 && (
              <Descriptions
                size="small"
                column={2}
                bordered
                title="物流信息"
                items={detailOrder.order_detail.delivery_info.delivery_product_info.flatMap((d, i) => [
                  { key: `deliveryName${i}`, label: '快递公司', children: d.delivery_name || d.delivery_id },
                  { key: `waybillId${i}`, label: '快递单号', children: d.waybill_id },
                ])}
              />
            )}

            {detailOrder.order_detail?.ext_info && (
              <Descriptions
                size="small"
                column={1}
                bordered
                title="备注"
                items={[
                  { key: 'customerNotes', label: '买家备注', children: detailOrder.order_detail.ext_info.customer_notes || '无' },
                  { key: 'merchantNotes', label: '商家备注', children: detailOrder.order_detail.ext_info.merchant_notes || '无' },
                ]}
              />
            )}

            {detailOrder.order_detail?.pay_info && (
              <Descriptions
                size="small"
                column={2}
                bordered
                title="支付信息"
                items={[
                  { key: 'payTime', label: '支付时间', children: formatTime(detailOrder.order_detail.pay_info.pay_time) },
                  { key: 'transactionId', label: '交易号', children: detailOrder.order_detail.pay_info.transaction_id || '-' },
                ]}
              />
            )}
          </Flex>
        ) : (
          <Empty description="获取订单详情失败" />
        )}
      </Modal>

      <SourceManagementModal
        open={sourceModalOpen}
        product={sourceProduct}
        rows={sourceRows}
        saving={sourceSaving}
        onRowsChange={setSourceRows}
        onCancel={() => setSourceModalOpen(false)}
        onSave={saveSources}
      />

      <ShippingSourceModal
        open={shipSourceModalOpen}
        product={shipSourceProduct}
        sources={shipSourceProduct ? productSources[shipSourceProduct.product_id] || [] : []}
        onCancel={() => setShipSourceModalOpen(false)}
        onOpenShipping={openShippingSession}
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
        onOpenTaobaoOrder={openTaobaoOrder}
      />
    </div>
  );
};

export default React.memo(Orders);
