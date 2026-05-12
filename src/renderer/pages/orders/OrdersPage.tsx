import React from 'react';
import { Card, Table, Tag, Button, Space, Alert, Badge } from 'antd';
import { ShoppingCartOutlined, SendOutlined, EyeOutlined } from '@ant-design/icons';

const mockOrders = [
  { id: 'WX20260511001', product: '夏季薄款防晒衣 女款', buyer: '微信用户***3', price: 89.9, cost: 45.0, profit: 44.9, status: 'pending', taobaoOrder: '-', createTime: '2026-05-11 10:23' },
  { id: 'WX20260511002', product: '家用便携榨汁杯', buyer: '微信用户***7', price: 59.9, cost: 28.5, profit: 31.4, status: 'pending', taobaoOrder: '-', createTime: '2026-05-11 09:45' },
  { id: 'WX20260510003', product: '男士透气运动鞋', buyer: '微信用户***1', price: 159.0, cost: 78.0, profit: 81.0, status: 'ordered', taobaoOrder: 'TB882910037', createTime: '2026-05-10 16:32' },
  { id: 'WX20260510004', product: '车载手机支架', buyer: '微信用户***5', price: 29.9, cost: 12.8, profit: 17.1, status: 'ordered', taobaoOrder: 'TB773829104', createTime: '2026-05-10 14:18' },
  { id: 'WX20260509005', product: '儿童益智积木套装', buyer: '微信用户***9', price: 128.0, cost: 65.0, profit: 63.0, status: 'shipped', taobaoOrder: 'TB661738295', createTime: '2026-05-09 11:05' },
  { id: 'WX20260509006', product: '不锈钢保温杯 500ml', buyer: '微信用户***2', price: 49.9, cost: 22.0, profit: 27.9, status: 'shipped', taobaoOrder: 'TB550627386', createTime: '2026-05-09 08:50' },
  { id: 'WX20260508007', product: '无线蓝牙耳机', buyer: '微信用户***4', price: 79.0, cost: 35.0, profit: 44.0, status: 'waiting', taobaoOrder: '-', createTime: '2026-05-08 20:15' },
  { id: 'WX20260508008', product: '厨房多功能切菜器', buyer: '微信用户***6', price: 39.9, cost: 18.5, profit: 21.4, status: 'waiting', taobaoOrder: '-', createTime: '2026-05-08 17:42' },
];

const statusMap: Record<string, { color: string; text: string }> = {
  pending: { color: 'orange', text: '待拍单' },
  waiting: { color: 'blue', text: '待发货' },
  ordered: { color: 'cyan', text: '已拍单' },
  shipped: { color: 'green', text: '已发货' },
};

const Orders: React.FC<{ accountId: string }> = () => {
  const columns = [
    { title: '订单号', dataIndex: 'id', key: 'id', width: 150 },
    { title: '商品名称', dataIndex: 'product', key: 'product', ellipsis: true },
    { title: '买家', dataIndex: 'buyer', key: 'buyer', width: 120 },
    { title: '售价', dataIndex: 'price', key: 'price', width: 80, render: (v: number) => `¥${v.toFixed(2)}` },
    { title: '采购价', dataIndex: 'cost', key: 'cost', width: 80, render: (v: number) => `¥${v.toFixed(2)}` },
    { title: '利润', dataIndex: 'profit', key: 'profit', width: 80, render: (v: number) => <span style={{ color: '#52c41a', fontWeight: 500 }}>¥{v.toFixed(2)}</span> },
    { title: '淘宝订单号', dataIndex: 'taobaoOrder', key: 'taobaoOrder', width: 130 },
    { title: '状态', dataIndex: 'status', key: 'status', width: 90, render: (s: string) => <Tag color={statusMap[s]?.color}>{statusMap[s]?.text}</Tag> },
    { title: '下单时间', dataIndex: 'createTime', key: 'createTime', width: 140 },
    {
      title: '操作', key: 'action', width: 120,
      render: (_: unknown, record: typeof mockOrders[0]) => (
        <Space size={4}>
          <Button type="link" size="small" icon={<ShoppingCartOutlined />} disabled>
            {record.status === 'pending' ? '去拍单' : '拍单'}
          </Button>
          <Button type="link" size="small" icon={<SendOutlined />} disabled>
            发货
          </Button>
        </Space>
      ),
    },
  ];

  const pendingCount = mockOrders.filter(o => o.status === 'pending').length;
  const totalProfit = mockOrders.reduce((sum, o) => sum + o.profit, 0);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Alert type="warning" showIcon banner message="订单管理功能开发中，当前展示数据仅供参考" />

      <div style={{ display: 'flex', gap: 12 }}>
        <Card size="small" style={{ flex: 1 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: '#999' }}>全部订单</div>
            <div style={{ fontSize: 24, fontWeight: 600 }}>{mockOrders.length}</div>
          </div>
        </Card>
        <Card size="small" style={{ flex: 1 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: '#999' }}>待拍单</div>
            <div style={{ fontSize: 24, fontWeight: 600, color: '#fa8c16' }}>
              <Badge count={pendingCount} offset={[10, 0]}>{pendingCount}</Badge>
            </div>
          </div>
        </Card>
        <Card size="small" style={{ flex: 1 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: '#999' }}>总利润</div>
            <div style={{ fontSize: 24, fontWeight: 600, color: '#52c41a' }}>¥{totalProfit.toFixed(2)}</div>
          </div>
        </Card>
      </div>

      <Card
        size="small"
        title="订单列表"
        style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
        styles={{ body: { flex: 1, overflow: 'auto', padding: 0, minHeight: 0 } }}
        extra={
          <Space>
            <Button size="small" icon={<EyeOutlined />} disabled>查看售后</Button>
            <Button size="small" type="primary" icon={<ShoppingCartOutlined />} disabled>批量拍单</Button>
          </Space>
        }
      >
        <Table
          dataSource={mockOrders}
          columns={columns}
          rowKey="id"
          size="small"
          pagination={{ pageSize: 20, size: 'small' }}
        />
      </Card>
    </div>
  );
};

export default Orders;
