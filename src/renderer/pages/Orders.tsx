import React from 'react';
import { Card, Empty, Button } from 'antd';
import { ClockCircleOutlined } from '@ant-design/icons';

const Orders: React.FC = () => {
  return (
    <Card title="订单管理">
      <Empty
        image={<ClockCircleOutlined style={{ fontSize: 64, color: '#999' }} />}
        description={
          <div>
            <p style={{ marginBottom: 8 }}>订单管理模块开发中</p>
            <p style={{ color: '#999', fontSize: 12 }}>预计功能：订单列表、状态追踪、物流信息、退款售后、淘宝订单关联</p>
          </div>
        }
      >
        <Button type="primary" disabled>
          敬请期待
        </Button>
      </Empty>
    </Card>
  );
};

export default Orders;
