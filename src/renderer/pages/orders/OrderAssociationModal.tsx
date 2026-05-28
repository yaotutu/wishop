import React, { useEffect } from 'react';
import { Button, Form, Input, Modal, Select, Space } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import type { LinkedPlatformOrder, Order, OrderAssociation } from '../../../shared/types';

interface OrderAssociationModalProps {
  open: boolean;
  order: Order | null;
  association?: OrderAssociation;
  saving: boolean;
  onCancel: () => void;
  onSave: (input: Pick<OrderAssociation, 'internalRemark' | 'linkedOrders'>) => Promise<void>;
}

interface AssociationFormValue {
  internalRemark: string;
  linkedOrders: Array<Partial<LinkedPlatformOrder>>;
}

const PLATFORM_OPTIONS = [
  { value: 'manual', label: '手工记录' },
  { value: 'other', label: '其他平台' },
];

function newLinkedOrder(): LinkedPlatformOrder {
  const now = Date.now();
  return {
    id: globalThis.crypto?.randomUUID?.() || `linked-${now}-${Math.random().toString(16).slice(2)}`,
    platform: 'manual',
    platformOrderId: '',
    platformOrderStatus: '',
    logisticsStatus: '',
    remark: '',
    createdAt: now,
    updatedAt: now,
  };
}

const OrderAssociationModal: React.FC<OrderAssociationModalProps> = ({ open, order, association, saving, onCancel, onSave }) => {
  const [form] = Form.useForm<AssociationFormValue>();

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({
      internalRemark: association?.internalRemark || '',
      linkedOrders: association?.linkedOrders?.length ? association.linkedOrders : [newLinkedOrder()],
    });
  }, [association, form, open]);

  const handleOk = async () => {
    const values = await form.validateFields();
    const now = Date.now();
    await onSave({
      internalRemark: String(values.internalRemark || '').trim(),
      linkedOrders: (values.linkedOrders || []).map(linked => ({
        id: linked.id || globalThis.crypto?.randomUUID?.() || `linked-${now}-${Math.random().toString(16).slice(2)}`,
        platform: linked.platform || 'manual',
        platformOrderId: String(linked.platformOrderId || '').trim(),
        platformOrderStatus: String(linked.platformOrderStatus || '').trim(),
        logisticsStatus: String(linked.logisticsStatus || '').trim(),
        logisticsCompany: String(linked.logisticsCompany || '').trim() || undefined,
        trackingNumber: String(linked.trackingNumber || '').trim() || undefined,
        remark: String(linked.remark || '').trim() || undefined,
        createdAt: linked.createdAt || now,
        updatedAt: now,
      })).filter(linked => linked.platformOrderId || linked.platformOrderStatus || linked.logisticsStatus || linked.remark),
    });
  };

  return (
    <Modal
      title={order ? `订单关联：${order.order_id}` : '订单关联'}
      open={open}
      onOk={handleOk}
      onCancel={onCancel}
      confirmLoading={saving}
      okText="保存"
      cancelText="取消"
      width={760}
      destroyOnHidden
    >
      <Form form={form} layout="vertical">
        <Form.Item name="internalRemark" label="内部备注">
          <Input.TextArea rows={2} placeholder="处理记录、售后备注、仓库备注等" />
        </Form.Item>
        <Form.List name="linkedOrders">
          {(fields, { add, remove }) => (
            <Space vertical size={12} style={{ width: '100%' }}>
              {fields.map(field => (
                <div key={field.key} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr 1fr 32px', gap: 8, alignItems: 'start' }}>
                  <Form.Item name={[field.name, 'platform']} label="来源">
                    <Select options={PLATFORM_OPTIONS} />
                  </Form.Item>
                  <Form.Item name={[field.name, 'platformOrderId']} label="关联单号">
                    <Input placeholder="内部单号或其他平台单号" />
                  </Form.Item>
                  <Form.Item name={[field.name, 'platformOrderStatus']} label="订单状态">
                    <Input placeholder="已采购、已取消等" />
                  </Form.Item>
                  <Form.Item name={[field.name, 'logisticsStatus']} label="物流状态">
                    <Input placeholder="待发货、运输中、已签收等" />
                  </Form.Item>
                  <Button
                    aria-label="删除关联"
                    icon={<DeleteOutlined />}
                    style={{ marginTop: 30 }}
                    onClick={() => remove(field.name)}
                  />
                </div>
              ))}
              <Button icon={<PlusOutlined />} onClick={() => add(newLinkedOrder())}>添加关联记录</Button>
            </Space>
          )}
        </Form.List>
      </Form>
    </Modal>
  );
};

export default OrderAssociationModal;
