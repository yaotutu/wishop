import React, { useState } from 'react';
import { Card, Alert, Input, Button, Tag, Space, Row, Col } from 'antd';
import { SearchOutlined, ShoppingCartOutlined, PlusOutlined } from '@ant-design/icons';

const mockProducts = [
  { id: 1, title: '夏季新款冰丝防晒衣 女中长款薄款防紫外线', price: 45.0, originalPrice: 128.0, source: '淘宝', shop: '优衣库旗舰店', sales: 2341 },
  { id: 2, title: '家用便携式榨汁杯 USB充电水果搅拌机', price: 28.5, originalPrice: 79.0, source: '1688', shop: '深圳市创意电器厂', sales: 5620 },
  { id: 3, title: '男士透气网面运动鞋 轻便跑步鞋', price: 78.0, originalPrice: 259.0, source: '1688', shop: '莆田运动鞋源头工厂', sales: 8930 },
  { id: 4, title: '车载手机支架 出风口导航架', price: 12.8, originalPrice: 39.9, source: '淘宝', shop: '车品优选店', sales: 12500 },
  { id: 5, title: '儿童益智积木 大颗粒拼装玩具套装', price: 65.0, originalPrice: 168.0, source: '1688', shop: '汕头澄海玩具厂', sales: 3470 },
  { id: 6, title: '316不锈钢保温杯 男女便携大容量500ml', price: 22.0, originalPrice: 69.9, source: '1688', shop: '永康杯业源头厂', sales: 7820 },
  { id: 7, title: '无线蓝牙耳机 入耳式降噪运动耳机', price: 35.0, originalPrice: 129.0, source: '淘宝', shop: '数码配件工厂店', sales: 4560 },
  { id: 8, title: '厨房多功能切菜器 不锈钢刨丝器', price: 18.5, originalPrice: 49.9, source: '1688', shop: '金华厨具批发', sales: 6340 },
];

const sourceColors: Record<string, string> = {
  '淘宝': 'orange',
  '1688': 'blue',
};

const ProductSource: React.FC = () => {
  const [searchText] = useState('');

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Alert type="warning" showIcon banner message="选品采集功能开发中，当前展示数据仅供参考" />

      <Card size="small">
        <Space>
          <Input
            placeholder="搜索商品关键词（如：防晒衣、榨汁杯）"
            value={searchText}
            style={{ width: 360 }}
            disabled
          />
          <Button type="primary" icon={<SearchOutlined />} disabled>搜索</Button>
          <Button icon={<PlusOutlined />} disabled>批量采集</Button>
          <span style={{ color: '#999', fontSize: 12, marginLeft: 8 }}>数据来源：淘宝 / 1688</span>
        </Space>
      </Card>

      <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        <Row gutter={[12, 12]}>
          {mockProducts.map(product => (
            <Col key={product.id} xs={12} sm={8} md={6}>
              <Card
                size="small"
                hoverable
                styles={{ body: { padding: 12 } }}
              >
                <div style={{
                  height: 120,
                  background: '#f5f5f5',
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 8,
                  color: '#ccc',
                  fontSize: 12,
                }}>
                  商品图片
                </div>
                <div style={{ fontSize: 13, lineHeight: '18px', height: 36, overflow: 'hidden', marginBottom: 6 }}>
                  {product.title}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ color: '#ff4d4f', fontWeight: 600, fontSize: 16 }}>¥{product.price.toFixed(2)}</span>
                  <Tag color={sourceColors[product.source]}>{product.source}</Tag>
                </div>
                <div style={{ fontSize: 11, color: '#999', marginBottom: 8 }}>
                  {product.shop} · 已售{product.sales}
                </div>
                <Button type="primary" size="small" icon={<ShoppingCartOutlined />} block disabled>
                  采集上架
                </Button>
              </Card>
            </Col>
          ))}
        </Row>
      </div>
    </div>
  );
};

export default ProductSource;
