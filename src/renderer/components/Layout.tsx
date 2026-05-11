import React, { useEffect, useState } from 'react';
import { Layout as AntLayout, Menu, Tabs, Button, Dropdown, Empty } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, ArrowUpOutlined } from '@ant-design/icons';
import Listing from '../pages/Listing';
import Orders from '../pages/Orders';
import ProductSource from '../pages/ProductSource';
import AiAnalysis from '../pages/AiAnalysis';
import Dashboard from '../pages/Dashboard';
import Settings from '../pages/Settings';
import { useAccounts } from '../hooks/useAccounts';
import type { Account } from '../../shared/types';
import AccountModals from './AccountModals';

const { Sider, Content } = AntLayout;

type PageType = 'listing' | 'orders' | 'productSource' | 'aiAnalysis' | 'dashboard' | 'settings';

const Layout: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<PageType>('listing');
  const { accounts, activeAccountId, fetchAccounts, addAccount, removeAccount, updateAccount, switchAccount } = useAccounts();

  const [updateDownloaded, setUpdateDownloaded] = useState<{ version: string } | null>(null);
  const [version, setVersion] = useState('');

  const { openAddModal, openEditModal, confirmRemove, modals } = AccountModals({
    addAccount, updateAccount, removeAccount, switchAccount,
  });

  useEffect(() => {
    fetchAccounts();
    window.appVersion?.get().then(v => setVersion(v));
  }, []);

  useEffect(() => {
    window.updater?.onDownloaded((info) => {
      setUpdateDownloaded(info);
    });
  }, []);

  const activeAccount = accounts.find(a => a.id === activeAccountId);

  const renderPage = () => {
    if (!activeAccountId || !activeAccount) {
      return (
        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Empty description="请先添加店铺" />
        </div>
      );
    }
    switch (currentPage) {
      case 'listing':
        return <Listing accountId={activeAccountId} />;
      case 'orders':
        return <Orders />;
      case 'productSource':
        return <ProductSource />;
      case 'aiAnalysis':
        return <AiAnalysis />;
      case 'dashboard':
        return <Dashboard />;
      case 'settings':
        return <Settings accountId={activeAccountId} />;
      default:
        return <Listing accountId={activeAccountId} />;
    }
  };

  const tabItems = accounts.map(account => ({
    key: account.id,
    label: (
      <Dropdown
        menu={{
          items: [
            { key: 'edit', icon: <EditOutlined />, label: '编辑名称', onClick: () => openEditModal(account) },
            { key: 'delete', icon: <DeleteOutlined />, label: '删除店铺', danger: true, onClick: () => confirmRemove(account) },
          ],
        }}
        trigger={['contextMenu']}
      >
        <span>{account.name}</span>
      </Dropdown>
    ),
  }));

  return (
    <AntLayout style={{ height: '100vh' }}>
      <div style={{
        height: 40,
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        alignItems: 'center',
        paddingLeft: 12,
        paddingRight: 12,
        background: '#fafafa',
        gap: 4,
      }}>
        <Tabs
          activeKey={activeAccountId}
          onChange={(key) => switchAccount(key)}
          items={tabItems}
          size="small"
          style={{ flex: 1, marginBottom: 0, minWidth: 0 }}
          tabBarStyle={{ margin: 0 }}
        />
        <Button
          type="dashed"
          size="small"
          icon={<PlusOutlined />}
          onClick={openAddModal}
          style={{ color: '#1677ff', borderColor: '#1677ff', fontWeight: 500 }}
        >
          添加店铺
        </Button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 8 }}>
          {updateDownloaded && (
            <Button
              size="small"
              type="primary"
              icon={<ArrowUpOutlined />}
              onClick={() => window.updater?.install()}
            >
              更新到 v{updateDownloaded.version}
            </Button>
          )}
          <span style={{ color: '#bbb', fontSize: 12 }}>v{version}</span>
        </div>
      </div>

      <AntLayout>
        {activeAccount && (
          <Sider width={200} theme="light">
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Menu
                mode="inline"
                selectedKeys={[currentPage]}
                onClick={({ key }) => setCurrentPage(key as PageType)}
                style={{ flex: 1 }}
                items={[
                  { key: 'listing', label: '上架' },
                  { key: 'orders', label: '订单管理' },
                  { key: 'productSource', label: '选品采集' },
                  { key: 'aiAnalysis', label: 'AI 分析' },
                  { key: 'dashboard', label: '数据看板' },
                  { key: 'settings', label: '设置' },
                ]}
              />
            </div>
          </Sider>
        )}
        <AntLayout>
          <Content style={{ padding: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {renderPage()}
          </Content>
        </AntLayout>
      </AntLayout>

      {modals}
    </AntLayout>
  );
};

export default Layout;
