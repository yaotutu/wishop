import React, { useEffect, useState } from 'react';
import { Layout as AntLayout, Tabs, Button, Empty } from 'antd';
import { ArrowUpOutlined } from '@ant-design/icons';
import StoreManagement from '../pages/store-management/StoreManagement';
import AccountWorkspace from './AccountWorkspace';
import type { AccountModuleType } from './AccountWorkspace';
import { useAccounts } from '../hooks/useAccounts';
import { useBrowser } from '../hooks/useBrowser';

const { Sider, Content } = AntLayout;

type ModuleType = 'orders' | 'storeManagement' | 'commonFunctions' | 'settings';

const ACCOUNT_MODULES = new Set<string>(['orders', 'commonFunctions', 'settings']);

const MODULES: { key: ModuleType; label: string }[] = [
  { key: 'orders', label: '订单管理' },
  { key: 'storeManagement', label: '店铺管理' },
  { key: 'commonFunctions', label: '商品提审' },
  { key: 'settings', label: '设置' },
];

export const BrowserContext = React.createContext<{
  openBrowser: () => void;
}>({ openBrowser: () => {} });

const Layout: React.FC = () => {
  const [activeModule, setActiveModule] = useState<ModuleType>('orders');
  const { accounts, activeAccountId, fetchAccounts, addAccount, removeAccount, updateAccount, switchAccount } = useAccounts();
  const { openBrowser } = useBrowser();

  const [updateDownloaded, setUpdateDownloaded] = useState<{ version: string } | null>(null);
  const [version, setVersion] = useState('');

  useEffect(() => {
    fetchAccounts();
    window.appVersion?.get().then((v: string) => setVersion(v));
  }, []);

  useEffect(() => {
    window.updater?.onDownloaded((info: { version: string }) => {
      setUpdateDownloaded(info);
    });
  }, []);

  const activeAccount = accounts.find(a => a.id === activeAccountId);

  const renderPage = () => {
    // 全局页面
    if (activeModule === 'storeManagement') {
      return (
        <StoreManagement
          accounts={accounts}
          addAccount={addAccount}
          updateAccount={updateAccount}
          removeAccount={removeAccount}
          switchAccount={switchAccount}
          activeAccountId={activeAccountId}
        />
      );
    }

    // 账号级页面：每账号独立实例
    if (ACCOUNT_MODULES.has(activeModule)) {
      if (accounts.length === 0) {
        return (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Empty description="请先添加店铺" />
          </div>
        );
      }
      return (
        <div style={{ height: '100%', position: 'relative' }}>
          {accounts.map(account => (
            <div
              key={account.id}
              style={{
                height: '100%',
                display: account.id === activeAccountId ? 'flex' : 'none',
                flexDirection: 'column',
              }}
            >
              <AccountWorkspace accountId={account.id} activeModule={activeModule as AccountModuleType} />
            </div>
          ))}
        </div>
      );
    }

    return null;
  };

  const moduleTabItems = MODULES.map(m => ({ key: m.key, label: m.label }));

  return (
    <BrowserContext.Provider value={{ openBrowser }}>
      <AntLayout style={{ height: '100vh' }}>
        {/* 顶部：模块标签页 */}
        <div style={{
          height: 48,
          borderBottom: '1px solid #f0f0f0',
          display: 'flex',
          alignItems: 'center',
          paddingLeft: 12,
          paddingRight: 12,
          background: '#fafafa',
          gap: 4,
        }}>
          <Tabs
            activeKey={activeModule}
            onChange={(key) => setActiveModule(key as ModuleType)}
            items={moduleTabItems}
            size="small"
            style={{ flex: 1, marginBottom: 0, minWidth: 0 }}
            tabBarStyle={{ margin: 0 }}
          />
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

        {/* 主体：左侧账号列表 + 右侧内容 */}
        <AntLayout>
          <Sider width={180} theme="light" style={{ borderRight: '1px solid #f0f0f0' }}>
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '12px 16px 8px', fontWeight: 500, fontSize: 13, color: '#999' }}>
                账号列表
              </div>
              <div style={{ flex: 1, overflow: 'auto' }}>
                {accounts.map((account, index) => (
                  <div
                    key={account.id}
                    onClick={() => switchAccount(account.id)}
                    style={{
                      padding: '8px 16px',
                      cursor: 'pointer',
                      background: account.id === activeAccountId ? '#e6f4ff' : 'transparent',
                      borderLeft: account.id === activeAccountId ? '3px solid #1677ff' : '3px solid transparent',
                      fontSize: 13,
                      userSelect: 'none',
                      transition: 'background 0.2s',
                    }}
                  >
                    {index + 1}. {account.name}
                  </div>
                ))}
              </div>
            </div>
          </Sider>
          <AntLayout>
            <Content style={{ padding: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {renderPage()}
            </Content>
          </AntLayout>
        </AntLayout>
      </AntLayout>
    </BrowserContext.Provider>
  );
};

export default Layout;
