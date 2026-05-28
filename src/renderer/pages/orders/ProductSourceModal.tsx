import React, { useEffect } from 'react';
import { Button, Form, Input, InputNumber, Modal, Space } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import type { OrderProductInfo, ProductSourceItem } from '../../../shared/types';

interface ProductSourceModalProps {
  open: boolean;
  product: OrderProductInfo | null;
  sources: ProductSourceItem[];
  saving: boolean;
  onCancel: () => void;
  onSave: (sources: ProductSourceItem[]) => Promise<void>;
}

interface ProductSourceFormValue {
  sources: Array<Partial<ProductSourceItem>>;
}

function newSource(): ProductSourceItem {
  const now = Date.now();
  return {
    id: globalThis.crypto?.randomUUID?.() || `source-${now}-${Math.random().toString(16).slice(2)}`,
    url: '',
    quantity: 1,
    remark: '',
    createdAt: now,
    updatedAt: now,
  };
}

const ProductSourceModal: React.FC<ProductSourceModalProps> = ({ open, product, sources, saving, onCancel, onSave }) => {
  const [form] = Form.useForm<ProductSourceFormValue>();

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({ sources: sources.length > 0 ? sources : [newSource()] });
  }, [form, open, sources]);

  const handleOk = async () => {
    const values = await form.validateFields();
    const now = Date.now();
    await onSave((values.sources || []).map(source => ({
      id: source.id || globalThis.crypto?.randomUUID?.() || `source-${now}-${Math.random().toString(16).slice(2)}`,
      url: String(source.url || '').trim(),
      quantity: Number(source.quantity || 1),
      remark: String(source.remark || '').trim(),
      createdAt: source.createdAt || now,
      updatedAt: now,
    })).filter(source => source.url || source.remark));
  };

  return (
    <Modal
      title={product ? `货源管理：${product.title || product.product_id}` : '货源管理'}
      open={open}
      onOk={handleOk}
      onCancel={onCancel}
      confirmLoading={saving}
      okText="保存"
      cancelText="取消"
      width={720}
      destroyOnHidden
    >
      <Form form={form} layout="vertical">
        <Form.List name="sources">
          {(fields, { add, remove }) => (
            <Space vertical size={12} style={{ width: '100%' }}>
              {fields.map(field => (
                <div key={field.key} style={{ display: 'grid', gridTemplateColumns: '1fr 96px 1fr 32px', gap: 8, alignItems: 'start' }}>
                  <Form.Item name={[field.name, 'url']} label="货源链接/标识">
                    <Input placeholder="手工货源链接或内部标识" />
                  </Form.Item>
                  <Form.Item name={[field.name, 'quantity']} label="数量">
                    <InputNumber min={1} precision={0} style={{ width: '100%' }} />
                  </Form.Item>
                  <Form.Item name={[field.name, 'remark']} label="备注">
                    <Input placeholder="颜色、仓库、采购备注等" />
                  </Form.Item>
                  <Button
                    aria-label="删除货源"
                    icon={<DeleteOutlined />}
                    style={{ marginTop: 30 }}
                    onClick={() => remove(field.name)}
                  />
                </div>
              ))}
              <Button icon={<PlusOutlined />} onClick={() => add(newSource())}>添加货源</Button>
            </Space>
          )}
        </Form.List>
      </Form>
    </Modal>
  );
};

export default ProductSourceModal;
