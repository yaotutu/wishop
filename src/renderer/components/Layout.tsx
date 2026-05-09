import React, { useState } from 'react';
import { Layout as AntLayout, Menu } from 'antd';
import Listing from '../pages/Listing';
import Logs from '../pages/Logs';
import Orders from '../pages/Orders';
import Settings from '../pages/Settings';

const { Sider, Content } = AntLayout;

type PageType = 'listing' | 'logs' | 'orders' | 'settings';

const Layout: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<PageType>('listing');

  const renderPage = () => {
    switch (currentPage) {
      case 'listing':
        return <Listing />;
      case 'logs':
        return <Logs />;
      case 'orders':
        return <Orders />;
      case 'settings':
        return <Settings />;
      default:
        return <Listing />;
    }
  };

  return (
    <AntLayout style={{ height: '100vh' }}>
      <Sider width={200} theme="light">
        <div style={{
          height: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: '1px solid #f0f0f0',
          fontSize: 14,
          fontWeight: 'bold',
          color: '#1677ff'
        }}>
          Wishop
        </div>
        <Menu
          mode="inline"
          selectedKeys={[currentPage]}
          onClick={({ key }) => setCurrentPage(key as PageType)}
          items={[
            { key: 'listing', label: '上架' },
            { key: 'logs', label: '上架记录' },
            { key: 'orders', label: '订单管理' },
            { key: 'settings', label: '设置' },
          ]}
        />
      </Sider>
      <AntLayout>
        <Content style={{ padding: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {renderPage()}
        </Content>
      </AntLayout>
    </AntLayout>
  );
};

export default Layout;
