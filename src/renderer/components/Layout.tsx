import React, { useEffect, useState } from 'react';
import { Layout as AntLayout, Menu, Tabs, Modal, Input, Button, Dropdown, message, Empty } from 'antd';
import { PlusOutlined, SettingOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import Listing from '../pages/Listing';
import Orders from '../pages/Orders';
import Settings from '../pages/Settings';
import { useAccounts, Account } from '../hooks/useIpc';

const { Sider, Content } = AntLayout;

type PageType = 'listing' | 'orders' | 'settings';

const Layout: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<PageType>('listing');
  const { accounts, activeAccountId, fetchAccounts, addAccount, removeAccount, updateAccount, switchAccount } = useAccounts();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [formState, setFormState] = useState({ name: '', appId: '', appSecret: '' });

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleAdd = async () => {
    if (!formState.name || !formState.appId || !formState.appSecret) {
      message.error('请填写完整信息');
      return;
    }
    const account = await addAccount(formState.name, { appId: formState.appId, appSecret: formState.appSecret });
    await switchAccount(account.id);
    setAddModalOpen(false);
    setFormState({ name: '', appId: '', appSecret: '' });
    message.success('店铺已添加');
  };

  const handleEdit = async () => {
    if (!editingAccount || !formState.name) return;
    await updateAccount(editingAccount.id, { name: formState.name });
    setEditModalOpen(false);
    setEditingAccount(null);
    setFormState({ name: '', appId: '', appSecret: '' });
    message.success('店铺已更新');
  };

  const openEditModal = (account: Account) => {
    setEditingAccount(account);
    setFormState({ name: account.name, appId: account.config.appId, appSecret: account.config.appSecret });
    setEditModalOpen(true);
  };

  const handleRemove = async (account: Account) => {
    Modal.confirm({
      title: `确认删除店铺「${account.name}」？`,
      content: '删除后该店铺的所有数据将被清除',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        await removeAccount(account.id);
        message.success('店铺已删除');
      },
    });
  };

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
            { key: 'delete', icon: <DeleteOutlined />, label: '删除店铺', danger: true, onClick: () => handleRemove(account) },
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
      {/* Account tab bar */}
      {accounts.length > 0 && (
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
            style={{ flex: 1, marginBottom: 0 }}
            tabBarStyle={{ margin: 0 }}
          />
          <Button
            type="text"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => {
              setFormState({ name: '', appId: '', appSecret: '' });
              setAddModalOpen(true);
            }}
          />
        </div>
      )}
      {accounts.length === 0 && (
        <div style={{
          height: 40,
          borderBottom: '1px solid #f0f0f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#fafafa',
        }}>
          <Button
            type="link"
            icon={<PlusOutlined />}
            onClick={() => {
              setFormState({ name: '', appId: '', appSecret: '' });
              setAddModalOpen(true);
            }}
          >
            添加店铺
          </Button>
        </div>
      )}
      <AntLayout>
        {activeAccount && (
          <Sider width={200} theme="light">
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div style={{
                height: 50,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderBottom: '1px solid #f0f0f0',
                fontSize: 14,
                fontWeight: 'bold',
                color: '#1677ff',
              }}>
                Wishop v{window.appVersion}
              </div>
              <Menu
                mode="inline"
                selectedKeys={[currentPage]}
                onClick={({ key }) => setCurrentPage(key as PageType)}
                style={{ flex: 1 }}
                items={[
                  { key: 'listing', label: '上架' },
                  { key: 'orders', label: '订单管理' },
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

      {/* Add account modal */}
      <Modal
        title="添加店铺"
        open={addModalOpen}
        onOk={handleAdd}
        onCancel={() => setAddModalOpen(false)}
        okText="添加"
        cancelText="取消"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Input
            placeholder="店铺名称"
            value={formState.name}
            onChange={e => setFormState(s => ({ ...s, name: e.target.value }))}
          />
          <Input
            placeholder="AppID"
            value={formState.appId}
            onChange={e => setFormState(s => ({ ...s, appId: e.target.value }))}
          />
          <Input.Password
            placeholder="AppSecret"
            value={formState.appSecret}
            onChange={e => setFormState(s => ({ ...s, appSecret: e.target.value }))}
          />
        </div>
      </Modal>

      {/* Edit account modal */}
      <Modal
        title="编辑店铺"
        open={editModalOpen}
        onOk={handleEdit}
        onCancel={() => { setEditModalOpen(false); setEditingAccount(null); }}
        okText="保存"
        cancelText="取消"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Input
            placeholder="店铺名称"
            value={formState.name}
            onChange={e => setFormState(s => ({ ...s, name: e.target.value }))}
          />
        </div>
      </Modal>
    </AntLayout>
  );
};

export default Layout;
