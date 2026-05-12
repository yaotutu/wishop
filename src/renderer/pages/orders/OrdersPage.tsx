import React, { useEffect, useState, useCallback } from 'react';
import { Table, Tag, Button, Input, Select, Modal, Descriptions, Image, Spin, Empty, Typography } from 'antd';
import { SearchOutlined, EyeOutlined, ReloadOutlined } from '@ant-design/icons';
import { useOrders } from '../../hooks/useIpc';
import type { Order, OrderStatus, OrderProductInfo, OrderSearchParams, OrderAddressInfo } from '../../../shared/types';
import { OrderStatus as OrderStatusEnum } from '../../../shared/types';

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

const STATUS_FILTERS: { label: string; status?: OrderStatus }[] = [
  { label: '全部' },
  { label: '待付款', status: OrderStatusEnum.PendingPayment },
  { label: '待发货', status: OrderStatusEnum.PendingShipment },
  { label: '已发货', status: OrderStatusEnum.PendingReceipt },
  { label: '已完成', status: OrderStatusEnum.Completed },
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

const labelStyle: React.CSSProperties = { fontSize: 12, color: '#999', lineHeight: '18px' };
const valueStyle: React.CSSProperties = { fontSize: 12, color: '#333', lineHeight: '18px' };

const Orders: React.FC<{ accountId: string }> = ({ accountId }) => {
  const { orders, hasMore, loading, error, fetchOrders, fetchOrderDetail, searchOrders, decodeAddress } = useOrders(accountId);
  const [activeStatus, setActiveStatus] = useState<OrderStatus | undefined>(undefined);
  const [searchType, setSearchType] = useState<OrderSearchParams['search_type']>('order_id');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [decodedAddresses, setDecodedAddresses] = useState<Record<string, OrderAddressInfo>>({});
  const [decodingOrderIds, setDecodingOrderIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (accountId) {
      setActiveStatus(undefined);
      fetchOrders();
    }
  }, [accountId, fetchOrders]);

  const handleStatusFilter = useCallback((status?: OrderStatus) => {
    setActiveStatus(status);
    setSearchKeyword('');
    fetchOrders(status);
  }, [fetchOrders]);

  const handleSearch = useCallback(() => {
    if (!searchKeyword.trim()) {
      fetchOrders(activeStatus);
      return;
    }
    searchOrders({ search_type: searchType, keyword: searchKeyword.trim() });
  }, [searchType, searchKeyword, activeStatus, fetchOrders, searchOrders]);

  const handleLoadMore = useCallback(() => {
    fetchOrders(activeStatus, true);
  }, [activeStatus, fetchOrders]);

  const handleViewDetail = useCallback(async (orderId: string) => {
    setDetailModalOpen(true);
    setDetailLoading(true);
    setDetailOrder(null);
    const order = await fetchOrderDetail(orderId);
    setDetailOrder(order);
    setDetailLoading(false);
  }, [fetchOrderDetail]);

  const firstProduct = (order: Order): OrderProductInfo | undefined => {
    return order.order_detail?.product_infos?.[0];
  };

  const handleDecodeAddress = useCallback(async (orderId: string) => {
    setDecodingOrderIds(prev => new Set(prev).add(orderId));
    const addr = await decodeAddress(orderId);
    if (addr) {
      setDecodedAddresses(prev => ({ ...prev, [orderId]: addr }));
    }
    setDecodingOrderIds(prev => { const s = new Set(prev); s.delete(orderId); return s; });
  }, [decodeAddress]);

  const canDecodeAddress = (status: OrderStatus): boolean => {
    return [OrderStatusEnum.PendingShipment, OrderStatusEnum.PartialShipment, OrderStatusEnum.PendingReceipt].includes(status);
  };

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
              <Image src={product.thumb_img} width={50} height={50} style={{ borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} preview={false} />
            )}
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 12, color: '#999' }}>{record.order_id}</div>
              <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product?.title || '-'}</div>
              {product?.sku_code && <div style={labelStyle}>编码: {product.sku_code}</div>}
              <div style={labelStyle}>下单: {formatTime(record.create_time)}</div>
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
            <div style={valueStyle}>{specs}</div>
            <div style={labelStyle}>x{product.sku_cnt}</div>
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
            <div style={labelStyle}>商品 {formatPrice(pi.product_price)}</div>
            <div style={labelStyle}>运费 {formatPrice(pi.freight)}</div>
            {pi.discounted_price > 0 && (
              <div style={{ fontSize: 12, color: '#f50', lineHeight: '18px' }}>优惠 -{formatPrice(pi.discounted_price)}</div>
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
              <div style={labelStyle}>{PAYMENT_METHOD[payInfo.payment_method] || `支付方式${payInfo.payment_method}`}</div>
            )}
            {record.status === OrderStatusEnum.PendingShipment && product?.delivery_deadline && (
              <div style={{ fontSize: 12, color: '#fa8c16', lineHeight: '18px' }}>
                发货时限: {formatTime(product.delivery_deadline)}
              </div>
            )}
            {(record.status === OrderStatusEnum.PendingReceipt || record.status === OrderStatusEnum.Completed) && deliveryInfos?.length > 0 && (
              <>
                {deliveryInfos.map((d, i) => (
                  <div key={i} style={{ borderTop: i > 0 ? '1px dashed #e8e8e8' : undefined, paddingTop: i > 0 ? 4 : 0, marginTop: i > 0 ? 4 : 0 }}>
                    <div style={labelStyle}>{d.delivery_name || d.delivery_id}</div>
                    <div style={valueStyle}>{d.waybill_id}</div>
                    {d.delivery_time > 0 && <div style={labelStyle}>发货: {formatTime(d.delivery_time)}</div>}
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
        const real = decodedAddresses[record.order_id];
        const addr = real || masked;
        if (!addr) return '-';
        const fullAddr = `${addr.province_name || ''}${addr.city_name || ''}${addr.county_name || ''}${addr.detail_info || ''}`;
        const isDecoded = !!real;
        const isDecoding = decodingOrderIds.has(record.order_id);
        return (
          <div>
            <div style={valueStyle}>{addr.user_name} {addr.tel_number}</div>
            <div style={labelStyle} title={fullAddr}>
              {fullAddr.length > 25 ? fullAddr.substring(0, 25) + '...' : fullAddr}
            </div>
            {!isDecoded && canDecodeAddress(record.status) && (
              <Button
                type="link"
                size="small"
                loading={isDecoding}
                onClick={() => handleDecodeAddress(record.order_id)}
                style={{ padding: 0, height: 'auto', fontSize: 12 }}
              >
                查看真实地址
              </Button>
            )}
            {isDecoded && <div style={{ fontSize: 11, color: '#52c41a' }}>已解密</div>}
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
        if (!ext) return <span style={labelStyle}>无</span>;
        const hasCustomer = ext.customer_notes && ext.customer_notes.trim();
        const hasMerchant = ext.merchant_notes && ext.merchant_notes.trim();
        if (!hasCustomer && !hasMerchant) return <span style={labelStyle}>无</span>;
        return (
          <div>
            {hasCustomer && (
              <div>
                <span style={{ fontSize: 11, color: '#999' }}>买家: </span>
                <span style={{ fontSize: 12, color: '#333' }} title={ext.customer_notes}>
                  {ext.customer_notes!.length > 15 ? ext.customer_notes!.substring(0, 15) + '...' : ext.customer_notes}
                </span>
              </div>
            )}
            {hasMerchant && (
              <div>
                <span style={{ fontSize: 11, color: '#999' }}>商家: </span>
                <span style={{ fontSize: 12, color: '#1890ff' }} title={ext.merchant_notes}>
                  {ext.merchant_notes!.length > 15 ? ext.merchant_notes!.substring(0, 15) + '...' : ext.merchant_notes}
                </span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 70,
      render: (_: unknown, record: Order) => (
        <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record.order_id)}>
          详情
        </Button>
      ),
    },
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Status Filter */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {STATUS_FILTERS.map(f => (
          <Tag.CheckableTag
            key={f.label}
            checked={activeStatus === f.status}
            onChange={() => handleStatusFilter(f.status)}
            style={{ padding: '4px 12px', fontSize: 13, border: '1px solid #d9d9d9', borderRadius: 4 }}
          >
            {f.label}
          </Tag.CheckableTag>
        ))}
      </div>

      {/* Search */}
      <div style={{ display: 'flex', gap: 8 }}>
        <Select
          value={searchType}
          onChange={setSearchType}
          options={SEARCH_TYPE_OPTIONS}
          style={{ width: 120 }}
          size="small"
        />
        <Input
          value={searchKeyword}
          onChange={e => setSearchKeyword(e.target.value)}
          onPressEnter={handleSearch}
          placeholder="输入关键字搜索"
          size="small"
          style={{ flex: 1 }}
          allowClear
        />
        <Button type="primary" size="small" icon={<SearchOutlined />} onClick={handleSearch}>搜索</Button>
        <Button size="small" icon={<ReloadOutlined />} onClick={() => handleStatusFilter(activeStatus)}>刷新</Button>
      </div>

      {/* Error */}
      {error && (
        <Typography.Text type="danger" style={{ fontSize: 12 }}>{error}</Typography.Text>
      )}

      {/* Table */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <Table
          dataSource={orders}
          columns={columns}
          rowKey="order_id"
          size="small"
          loading={loading && orders.length === 0}
          pagination={false}
          scroll={{ x: 1100, y: 'calc(100vh - 320px)' }}
          locale={{ emptyText: loading ? <Spin /> : <Empty description="暂无订单" /> }}
          footer={() => hasMore ? (
            <div style={{ textAlign: 'center' }}>
              <Button size="small" loading={loading} onClick={handleLoadMore}>加载更多</Button>
            </div>
          ) : orders.length > 0 ? (
            <div style={{ textAlign: 'center', color: '#999', fontSize: 12 }}>没有更多订单</div>
          ) : null}
        />
      </div>

      {/* Detail Modal */}
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Descriptions size="small" column={2} bordered>
              <Descriptions.Item label="订单号">{detailOrder.order_id}</Descriptions.Item>
              <Descriptions.Item label="状态">
                {(() => {
                  const cfg = STATUS_CONFIG[detailOrder.status] || { color: 'default', text: `未知(${detailOrder.status})` };
                  return <Tag color={cfg.color}>{cfg.text}</Tag>;
                })()}
              </Descriptions.Item>
              <Descriptions.Item label="下单时间">{formatTime(detailOrder.create_time)}</Descriptions.Item>
              <Descriptions.Item label="更新时间">{formatTime(detailOrder.update_time)}</Descriptions.Item>
            </Descriptions>

            {/* Products */}
            <div>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>商品信息</div>
              {(detailOrder.order_detail?.product_infos || []).map((p, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, padding: '8px 0', borderBottom: '1px solid #f0f0f0', alignItems: 'center' }}>
                  {p.thumb_img && <Image src={p.thumb_img} width={50} height={50} style={{ borderRadius: 4, objectFit: 'cover' }} preview={false} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</div>
                    <div style={{ fontSize: 12, color: '#666' }}>
                      {p.sku_attrs?.map(a => `${a.attr_key}: ${a.attr_value}`).join(' / ')}
                    </div>
                    <div style={{ fontSize: 12, color: '#999', marginTop: 4, display: 'flex', gap: 16 }}>
                      <span>数量: {p.sku_cnt}</span>
                      <span>单价: {formatPrice(p.sale_price)}</span>
                      <span>实付: {formatPrice(p.real_price)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Price */}
            {detailOrder.order_detail?.price_info && (
              <Descriptions size="small" column={2} bordered title="价格信息">
                <Descriptions.Item label="商品总价">{formatPrice(detailOrder.order_detail.price_info.product_price)}</Descriptions.Item>
                <Descriptions.Item label="实付金额">{formatPrice(detailOrder.order_detail.price_info.order_price)}</Descriptions.Item>
                <Descriptions.Item label="运费">{formatPrice(detailOrder.order_detail.price_info.freight)}</Descriptions.Item>
                <Descriptions.Item label="优惠">{formatPrice(detailOrder.order_detail.price_info.discounted_price)}</Descriptions.Item>
                <Descriptions.Item label="商家实收">{formatPrice(detailOrder.order_detail.price_info.merchant_receieve_price)}</Descriptions.Item>
              </Descriptions>
            )}

            {/* Address */}
            {detailOrder.order_detail?.delivery_info?.address_info && (
              <Descriptions size="small" column={1} bordered title="收货信息">
                <Descriptions.Item label="收货人">{detailOrder.order_detail.delivery_info.address_info.user_name}</Descriptions.Item>
                <Descriptions.Item label="电话">{detailOrder.order_detail.delivery_info.address_info.tel_number}</Descriptions.Item>
                <Descriptions.Item label="地址">
                  {detailOrder.order_detail.delivery_info.address_info.province_name}
                  {detailOrder.order_detail.delivery_info.address_info.city_name}
                  {detailOrder.order_detail.delivery_info.address_info.county_name}
                  {detailOrder.order_detail.delivery_info.address_info.detail_info}
                </Descriptions.Item>
              </Descriptions>
            )}

            {/* Delivery */}
            {detailOrder.order_detail?.delivery_info?.delivery_product_info?.length > 0 && (
              <Descriptions size="small" column={2} bordered title="物流信息">
                {detailOrder.order_detail.delivery_info.delivery_product_info.map((d, i) => (
                  <React.Fragment key={i}>
                    <Descriptions.Item label="快递公司">{d.delivery_name || d.delivery_id}</Descriptions.Item>
                    <Descriptions.Item label="快递单号">{d.waybill_id}</Descriptions.Item>
                  </React.Fragment>
                ))}
              </Descriptions>
            )}

            {/* Notes */}
            {detailOrder.order_detail?.ext_info && (
              <Descriptions size="small" column={1} bordered title="备注">
                <Descriptions.Item label="买家备注">{detailOrder.order_detail.ext_info.customer_notes || '无'}</Descriptions.Item>
                <Descriptions.Item label="商家备注">{detailOrder.order_detail.ext_info.merchant_notes || '无'}</Descriptions.Item>
              </Descriptions>
            )}

            {/* Pay Info */}
            {detailOrder.order_detail?.pay_info && (
              <Descriptions size="small" column={2} bordered title="支付信息">
                <Descriptions.Item label="支付时间">{formatTime(detailOrder.order_detail.pay_info.pay_time)}</Descriptions.Item>
                <Descriptions.Item label="交易号">{detailOrder.order_detail.pay_info.transaction_id || '-'}</Descriptions.Item>
              </Descriptions>
            )}
          </div>
        ) : (
          <Empty description="获取订单详情失败" />
        )}
      </Modal>
    </div>
  );
};

export default Orders;
