import React, { useEffect, useState } from 'react';
import { Layout as AntLayout, Tabs, Empty } from 'antd';
import StoreManagement from '../pages/store-management/StoreManagement';
import SettingsPage from '../pages/settings/SettingsPage';
import AccountWorkspace from './AccountWorkspace';
import type { AccountModuleType } from './AccountWorkspace';
import { useAccounts } from '../hooks/useAccounts';
import type { Account } from '../../shared/types';
import { useBrowser } from '../hooks/useBrowser';

const { Sider, Content } = AntLayout;

type ModuleType = 'orders' | 'storeManagement' | 'commonFunctions' | 'violation' | 'settings';

const ACCOUNT_MODULES = new Set<string>(['orders', 'commonFunctions', 'violation']);

const MODULES: { key: ModuleType; label: string }[] = [
  { key: 'orders', label: '订单管理' },
  { key: 'storeManagement', label: '店铺管理' },
  { key: 'commonFunctions', label: '商品提审' },
  { key: 'violation', label: '违规词检测' },
  { key: 'settings', label: '设置' },
];

export const BrowserContext = React.createContext<{
  openBrowser: () => void;
}>({ openBrowser: () => {} });

/** 账号级布局：左侧账号列表 + 右侧内容 */
const AccountLayout: React.FC<{
  accounts: Account[];
  activeAccountId: string;
  switchAccount: (id: string) => void;
  children: React.ReactNode;
}> = ({ accounts, activeAccountId, switchAccount, children }) => (
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
        {children}
      </Content>
    </AntLayout>
  </AntLayout>
);

/** 全局布局：直接铺满内容 */
const GlobalLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Content style={{ padding: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
    {children}
  </Content>
);

const Layout: React.FC = () => {
  const [activeModule, setActiveModule] = useState<ModuleType>('orders');
  const { accounts, activeAccountId, fetchAccounts, addAccount, removeAccount, updateAccount, switchAccount } = useAccounts();
  const { openBrowser } = useBrowser();

  useEffect(() => {
    fetchAccounts();
  }, []);

  const isAccountModule = ACCOUNT_MODULES.has(activeModule);

  const renderPage = () => {
    switch (activeModule) {
      case 'storeManagement':
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
      case 'settings':
        return <SettingsPage />;
      default:
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
  };

  const moduleTabItems = MODULES.map(m => ({ key: m.key, label: m.label }));

  return (
    <BrowserContext.Provider value={{ openBrowser }}>
      <AntLayout style={{ height: '100vh' }}>
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
        </div>

        {isAccountModule ? (
          <AccountLayout accounts={accounts} activeAccountId={activeAccountId} switchAccount={switchAccount}>
            {renderPage()}
          </AccountLayout>
        ) : (
          <GlobalLayout>
            {renderPage()}
          </GlobalLayout>
        )}
      </AntLayout>
    </BrowserContext.Provider>
  );
};

export default Layout;
