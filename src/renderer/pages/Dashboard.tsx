import React from 'react';
import { Card, Alert, Table, Tag } from 'antd';
import { ArrowUpOutlined, ShoppingCartOutlined, DollarOutlined, TrophyOutlined } from '@ant-design/icons';

const stats = [
  { label: '今日订单', value: 12, icon: <ShoppingCartOutlined />, color: '#1677ff', change: '+3' },
  { label: '今日销售额', value: '¥1,234.60', icon: <DollarOutlined />, color: '#52c41a', change: '+¥328' },
  { label: '今日利润', value: '¥567.80', icon: <ArrowUpOutlined />, color: '#fa8c16', change: '+¥156' },
  { label: '在售商品', value: 86, icon: <TrophyOutlined />, color: '#722ed1', change: '+2' },
];

const trendData = [
  { date: '05/05', orders: 8, sales: 856.40, profit: 398.20 },
  { date: '05/06', orders: 15, sales: 1623.50, profit: 745.80 },
  { date: '05/07', orders: 11, sales: 1189.00, profit: 543.60 },
  { date: '05/08', orders: 18, sales: 1932.70, profit: 892.40 },
  { date: '05/09', orders: 14, sales: 1512.30, profit: 687.90 },
  { date: '05/10', orders: 20, sales: 2156.80, profit: 986.50 },
  { date: '05/11', orders: 12, sales: 1234.60, profit: 567.80 },
];

const topProducts = [
  { rank: 1, name: '夏季薄款防晒衣 女款', sales: 23, revenue: 2067.70, trend: 'up' },
  { rank: 2, name: '家用便携榨汁杯', sales: 19, revenue: 1138.10, trend: 'up' },
  { rank: 3, name: '男士透气运动鞋', sales: 15, revenue: 2385.00, trend: 'same' },
  { rank: 4, name: '车载手机支架', sales: 14, revenue: 418.60, trend: 'up' },
  { rank: 5, name: '无线蓝牙耳机', sales: 11, revenue: 869.00, trend: 'down' },
];

const Dashboard: React.FC = () => {
  const trendColumns = [
    { title: '日期', dataIndex: 'date', key: 'date', width: 80 },
    { title: '订单数', dataIndex: 'orders', key: 'orders', width: 80, render: (v: number) => <span style={{ fontWeight: 500 }}>{v}</span> },
    { title: '销售额', dataIndex: 'sales', key: 'sales', width: 100, render: (v: number) => `¥${v.toFixed(2)}` },
    { title: '利润', dataIndex: 'profit', key: 'profit', width: 100, render: (v: number) => <span style={{ color: '#52c41a' }}>¥{v.toFixed(2)}</span> },
  ];

  const topColumns = [
    { title: '排名', dataIndex: 'rank', key: 'rank', width: 60, render: (r: number) => <span style={{ fontWeight: 600, color: r <= 3 ? '#fa8c16' : '#666' }}>#{r}</span> },
    { title: '商品名称', dataIndex: 'name', key: 'name', ellipsis: true },
    { title: '销量', dataIndex: 'sales', key: 'sales', width: 70, render: (v: number) => <span style={{ fontWeight: 500 }}>{v}</span> },
    { title: '销售额', dataIndex: 'revenue', key: 'revenue', width: 100, render: (v: number) => `¥${v.toFixed(2)}` },
    {
      title: '趋势', dataIndex: 'trend', key: 'trend', width: 70,
      render: (t: string) => (
        <Tag color={t === 'up' ? 'success' : t === 'down' ? 'error' : 'default'}>
          {t === 'up' ? '↑' : t === 'down' ? '↓' : '→'}
        </Tag>
      ),
    },
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Alert type="warning" showIcon banner message="数据看板功能开发中，当前展示数据仅供参考" />

      <div style={{ display: 'flex', gap: 12 }}>
        {stats.map(stat => (
          <Card key={stat.label} size="small" style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 8,
                background: `${stat.color}15`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, color: stat.color,
              }}>
                {stat.icon}
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#999' }}>{stat.label}</div>
                <div style={{ fontSize: 22, fontWeight: 600 }}>{stat.value}</div>
              </div>
              <span style={{ marginLeft: 'auto', fontSize: 12, color: '#52c41a' }}>{stat.change}</span>
            </div>
          </Card>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12, flex: 1, minHeight: 0 }}>
        <Card
          size="small"
          title="近 7 天销售趋势"
          style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
          styles={{ body: { flex: 1, overflow: 'auto', padding: 0, minHeight: 0 } }}
        >
          <Table
            dataSource={trendData}
            columns={trendColumns}
            rowKey="date"
            size="small"
            pagination={false}
          />
        </Card>
        <Card
          size="small"
          title="热销商品排行"
          style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
          styles={{ body: { flex: 1, overflow: 'auto', padding: 0, minHeight: 0 } }}
        >
          <Table
            dataSource={topProducts}
            columns={topColumns}
            rowKey="rank"
            size="small"
            pagination={false}
          />
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
