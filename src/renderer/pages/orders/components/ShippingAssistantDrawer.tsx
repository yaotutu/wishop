import React, { useCallback, useState } from 'react';
import { Button, Descriptions, Drawer, Space, Typography, message } from 'antd';
import { CopyOutlined, FormOutlined, ReloadOutlined } from '@ant-design/icons';
import type { CheckoutAddressFillResult, OrderAddressInfo, OrderProductInfo, OrderRealAddressCache, ProductSourceItem } from '../../../../shared/types';
import { formatOrderAddressForCopy } from '../../../../shared/address-format';
import { getErrorMessage } from '../../../../shared/errors';

const { Text } = Typography;

interface ShippingAssistantSession {
  accountId: string;
  orderId: string;
  product: OrderProductInfo;
  source: ProductSourceItem;
  address?: OrderAddressInfo;
  customerNotes?: string;
  merchantNotes?: string;
  createTime?: number;
  payTime?: number;
  orderPrice?: number;
}

interface Props {
  open: boolean;
  session: ShippingAssistantSession | null;
  addressCache?: OrderRealAddressCache;
  onClose: () => void;
  onFetchAddress: (orderId: string, refresh?: boolean) => Promise<OrderRealAddressCache>;
  onFillCheckoutAddress: (address: OrderAddressInfo) => Promise<CheckoutAddressFillResult>;
}

function formatPrice(cents?: number): string {
  if (cents === undefined || cents === null) return '-';
  return `¥${(cents / 100).toFixed(2)}`;
}

function formatTime(timestamp?: number): string {
  if (!timestamp) return '-';
  return new Date(timestamp * 1000).toLocaleString('zh-CN');
}

function skuText(product?: OrderProductInfo): string {
  if (!product) return '';
  const attrs = product.sku_attrs
    ?.map(attr => [attr.attr_key, attr.attr_value].filter(Boolean).join(': '))
    .filter(Boolean)
    .join(' / ');
  return attrs || product.sku_code || '无规格';
}

async function copyText(text: string, label: string): Promise<void> {
  if (!text.trim()) {
    message.warning(`暂无${label}`);
    return;
  }
  await navigator.clipboard.writeText(text);
  message.success(`${label}已复制`);
}

export const ShippingAssistantDrawer: React.FC<Props> = ({
  open,
  session,
  addressCache,
  onClose,
  onFetchAddress,
  onFillCheckoutAddress,
}) => {
  const [addressLoading, setAddressLoading] = useState(false);
  const [fillAddressLoading, setFillAddressLoading] = useState(false);

  const address = addressCache?.address || session?.address;

  const fetchAddress = useCallback(async (refresh = false) => {
    if (!session) return;
    setAddressLoading(true);
    try {
      await onFetchAddress(session.orderId, refresh);
    } finally {
      setAddressLoading(false);
    }
  }, [onFetchAddress, session]);

  const fillCheckoutAddress = useCallback(async () => {
    if (!address) {
      message.warning('请先获取真实地址');
      return;
    }
    setFillAddressLoading(true);
    try {
      const result = await onFillCheckoutAddress(address);
      const warningText = result.warnings.filter(Boolean).join('；');
      if (result.filledFields.length > 0) {
        message.success(`已填写：${result.filledFields.join('、')}${warningText ? `；${warningText}` : ''}`);
      } else {
        message.warning(warningText || '未填写任何字段');
      }
    } catch (err: unknown) {
      message.error(`自动填写地址失败: ${getErrorMessage(err)}`);
    } finally {
      setFillAddressLoading(false);
    }
  }, [address, onFillCheckoutAddress]);

  const copyOrderInfo = useCallback(async () => {
    if (!session) return;
    const lines = [
      `订单号: ${session.orderId}`,
      `商品: ${session.product.title}`,
      `规格: ${skuText(session.product)}`,
      `数量: ${session.product.sku_cnt}`,
      `实付: ${formatPrice(session.orderPrice)}`,
      `下单: ${formatTime(session.createTime)}`,
      `支付: ${formatTime(session.payTime)}`,
      session.customerNotes?.trim() ? `买家备注: ${session.customerNotes.trim()}` : '',
      session.merchantNotes?.trim() ? `商家备注: ${session.merchantNotes.trim()}` : '',
      session.source.remark?.trim() ? `货源备注: ${session.source.remark.trim()}` : '',
      formatOrderAddressForCopy(address) ? `地址: ${formatOrderAddressForCopy(address).replace('\n', ' ')}` : '',
    ].filter(Boolean);
    await copyText(lines.join('\n'), '订单信息');
  }, [address, session]);

  return (
    <Drawer
      title="发货助手"
      open={open}
      onClose={onClose}
      size={420}
      destroyOnHidden
      extra={
        <Button icon={<CopyOutlined />} onClick={copyOrderInfo} disabled={!session}>
          复制订单
        </Button>
      }
    >
      {!session ? (
        <Text type="secondary">暂无发货会话</Text>
      ) : (
        <Space orientation="vertical" size={14} style={{ width: '100%' }}>
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="微信订单">{session.orderId}</Descriptions.Item>
            <Descriptions.Item label="商品">
              <Text copyable>{session.product.title}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="规格">
              <Text copyable>{skuText(session.product)}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="数量">x{session.product.sku_cnt}</Descriptions.Item>
            <Descriptions.Item label="实付">{formatPrice(session.orderPrice)}</Descriptions.Item>
            <Descriptions.Item label="货源">
              <Text copyable style={{ wordBreak: 'break-all' }}>{session.source.url}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="货源备注">{session.source.remark || '-'}</Descriptions.Item>
          </Descriptions>

          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="收货信息">
              <Space orientation="vertical" size={8} style={{ width: '100%' }}>
                <Text style={{ whiteSpace: 'pre-wrap' }}>{formatOrderAddressForCopy(address) || '未获取真实地址'}</Text>
                <Space>
                  <Button
                    size="small"
                    type="primary"
                    loading={addressLoading}
                    onClick={() => fetchAddress(false)}
                  >
                    获取真实地址
                  </Button>
                  <Button
                    size="small"
                    icon={<ReloadOutlined />}
                    loading={addressLoading}
                    onClick={() => fetchAddress(true)}
                  >
                    刷新
                  </Button>
                  <Button
                    size="small"
                    icon={<CopyOutlined />}
                    onClick={() => copyText(formatOrderAddressForCopy(address), '地址')}
                  >
                    复制地址
                  </Button>
                  <Button
                    size="small"
                    icon={<FormOutlined />}
                    loading={fillAddressLoading}
                    disabled={!address}
                    onClick={fillCheckoutAddress}
                  >
                    自动填地址
                  </Button>
                </Space>
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="备注">
              <Space orientation="vertical" size={2}>
                <Text>买家: {session.customerNotes || '无'}</Text>
                <Text>商家: {session.merchantNotes || '无'}</Text>
              </Space>
            </Descriptions.Item>
          </Descriptions>
        </Space>
      )}
    </Drawer>
  );
};

export type { ShippingAssistantSession };
