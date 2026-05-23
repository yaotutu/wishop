import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Layout as AntLayout, Tabs, Empty, Spin } from 'antd';
import { useAccounts } from '../domains/accounts/hooks';
import type { Account, ShippingAssistantSession } from '../../shared/types';
import { useBrowser } from '../domains/browser/hooks';
import GlobalLogDrawer from './GlobalLogDrawer';
import NotificationCenter from './NotificationCenter';
import { CredentialErrorProvider } from '../contexts/CredentialErrorContext';
import { useAppStore, type AppModule } from '../state/app-store';

const { Header, Sider, Content } = AntLayout;

const loadStoreManagement = () => import('../pages/store-management/StoreManagement');
const loadSettingsPage = () => import('../pages/settings/SettingsPage');
const loadOrdersPage = () => import('../pages/orders/OrdersPage');
const loadListingPage = () => import('../pages/common-functions/ListingPage');
const loadViolationPage = () => import('../pages/violation/ViolationPage');
const loadScheduledJobsPage = () => import('../pages/scheduled-jobs/ScheduledJobsPage');

const StoreManagement = lazy(loadStoreManagement);
const SettingsPage = lazy(loadSettingsPage);
const OrdersPage = lazy(loadOrdersPage);
const ListingPage = lazy(loadListingPage);
const ViolationPage = lazy(loadViolationPage);
const ScheduledJobsPage = lazy(loadScheduledJobsPage);

type ModuleType = AppModule;

const ACCOUNT_MODULES = new Set<string>(['orders', 'commonFunctions', 'violation']);

const MODULES: { key: ModuleType; label: string }[] = [
  { key: 'orders', label: '订单管理' },
  { key: 'storeManagement', label: '店铺管理' },
  { key: 'commonFunctions', label: '商品提审' },
  { key: 'scheduledJobs', label: '调度任务' },
  { key: 'violation', label: '违规词检测' },
  { key: 'settings', label: '设置' },
];

const preloadByModule: Record<ModuleType, () => Promise<unknown>> = {
  orders: loadOrdersPage,
  storeManagement: loadStoreManagement,
  commonFunctions: loadListingPage,
  scheduledJobs: loadScheduledJobsPage,
  violation: loadViolationPage,
  settings: loadSettingsPage,
};

function requestIdleWork(callback: () => void): () => void {
  const requestIdle = window.requestIdleCallback;
  if (requestIdle) {
    const id = requestIdle(callback, { timeout: 2500 });
    return () => window.cancelIdleCallback?.(id);
  }
  const id = window.setTimeout(callback, 800);
  return () => window.clearTimeout(id);
}

export const BrowserContext = React.createContext<{
  openBrowser: (profileId?: string, url?: string) => void;
  openCleanBrowser: (profileId?: string, url?: string) => void;
  openShippingAssistant: (profileId: string, url: string, session: ShippingAssistantSession) => void;
}>({ openBrowser: () => {}, openCleanBrowser: () => {}, openShippingAssistant: () => {} });

const PageFallback: React.FC = () => (
  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <Spin />
  </div>
);

/** 账户侧边栏 */
export const AccountSider: React.FC<{
  accounts: Account[];
  activeAccountId: string;
  activeModule: ModuleType;
  listingScope: 'account' | 'global';
  setListingScope: (scope: 'account' | 'global') => void;
  switchAccount: (id: string) => void;
}> = ({ accounts, activeAccountId, activeModule, listingScope, setListingScope, switchAccount }) => {
  const globalListingSelected = activeModule === 'commonFunctions' && listingScope === 'global';
  const isListingModule = activeModule === 'commonFunctions';
  return (
    <Sider width={180} theme="light" style={{ borderRight: '1px solid #f0f0f0' }}>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {isListingModule ? (
          <div data-testid="listing-global-scope-section" style={{ flexShrink: 0, padding: '12px 10px 12px', background: '#fafafa', borderBottom: '1px solid #f0f0f0' }}>
            <div style={{ padding: '0 6px 6px', fontWeight: 600, fontSize: 12, color: '#8c8c8c' }}>
              全局范围
            </div>
            <div
              data-testid="listing-global-scope"
              onClick={() => setListingScope('global')}
              style={{
                padding: '9px 10px',
                cursor: 'pointer',
                background: globalListingSelected ? '#e6f4ff' : '#fff',
                border: globalListingSelected ? '1px solid #91caff' : '1px solid #f0f0f0',
                borderLeft: globalListingSelected ? '3px solid #1677ff' : '3px solid #d9d9d9',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                userSelect: 'none',
                transition: 'background 0.2s, border-color 0.2s',
              }}
            >
              <div>全部账号</div>
              <div style={{ marginTop: 2, color: '#999', fontSize: 11, fontWeight: 400 }}>统一配置与全账号任务</div>
            </div>
          </div>
        ) : (
          <div style={{ padding: '12px 16px 8px', fontWeight: 500, fontSize: 13, color: '#999' }}>
            账号列表
          </div>
        )}
        <div data-testid="account-list-section" style={{ flex: 1, overflow: 'auto' }}>
          {isListingModule && (
            <div style={{ padding: '12px 16px 6px', fontWeight: 600, fontSize: 12, color: '#8c8c8c' }}>
              店铺账号
            </div>
          )}
          {accounts.map((account, index) => (
            <div
              key={account.id}
              onClick={() => {
                if (isListingModule) setListingScope('account');
                switchAccount(account.id);
              }}
              style={{
                padding: '8px 16px',
                cursor: 'pointer',
                background: !globalListingSelected && account.id === activeAccountId ? '#e6f4ff' : 'transparent',
                borderLeft: !globalListingSelected && account.id === activeAccountId ? '3px solid #1677ff' : '3px solid transparent',
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
  );
};

/** 账户作用域的模块内容：模块首次打开后常驻，切 tab 只切 display。 */
const AccountModuleContent: React.FC<{
  accounts: Account[];
  activeAccountId: string;
  listingScope: 'account' | 'global';
  module: ModuleType;
}> = ({ accounts, activeAccountId, listingScope, module }) => {
  if (accounts.length === 0) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Empty description="请先添加店铺" />
      </div>
    );
  }
  const activeAccount = accounts.find(account => account.id === activeAccountId) || accounts[0];
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {module === 'orders' && <OrdersPage accountId={activeAccount.id} />}
      {module === 'commonFunctions' && <ListingPage accountId={activeAccount.id} scope={listingScope} />}
      {module === 'violation' && <ViolationPage accountId={activeAccount.id} />}
    </div>
  );
};

const Layout: React.FC = () => {
  const activeModule = useAppStore(state => state.activeModule);
  const setActiveModule = useAppStore(state => state.setActiveModule);
  const settingsTab = useAppStore(state => state.settingsTab);
  const setSettingsTab = useAppStore(state => state.setSettingsTab);
  const [mountedModules, setMountedModules] = useState<ModuleType[]>(['orders']);
  const [version, setVersion] = useState('');
  const [listingScope, setListingScope] = useState<'account' | 'global'>('account');
  const { accounts, activeAccountId, fetchAccounts, addAccount, removeAccount, updateAccount, switchAccount } = useAccounts();
  const { openBrowser, openCleanBrowser, openShippingAssistant } = useBrowser();
  const moduleSwitchTimerRef = useRef<number | null>(null);

  useEffect(() => {
    fetchAccounts();
    window.appVersion?.get().then((v: string) => setVersion(v));
  }, []);

  useEffect(() => requestIdleWork(() => {
    void preloadByModule.scheduledJobs();
    void preloadByModule.storeManagement();
    void preloadByModule.settings();
    void preloadByModule.commonFunctions();
    void preloadByModule.violation();
  }), []);

  useEffect(() => () => {
    if (moduleSwitchTimerRef.current !== null) {
      window.clearTimeout(moduleSwitchTimerRef.current);
    }
  }, []);

  const isAccountModule = ACCOUNT_MODULES.has(activeModule);
  const activeModuleMounted = mountedModules.includes(activeModule);
  const browserValue = useMemo(() => ({ openBrowser, openCleanBrowser, openShippingAssistant }), [openBrowser, openCleanBrowser, openShippingAssistant]);

  const switchModule = useCallback((module: ModuleType) => {
    setActiveModule(module);
    void preloadByModule[module]();
    if (moduleSwitchTimerRef.current !== null) {
      window.clearTimeout(moduleSwitchTimerRef.current);
    }
    // Let the tab selection paint before mounting a module for the first time.
    moduleSwitchTimerRef.current = window.setTimeout(() => {
      setMountedModules(prev => prev.includes(module) ? prev : [...prev, module]);
      moduleSwitchTimerRef.current = null;
    }, 0);
  }, []);

  const handleVersionClick = useCallback(() => {
    setSettingsTab('about');
    switchModule('settings');
  }, [setSettingsTab, switchModule]);

  const navigateToStoreManagement = useCallback(() => {
    switchModule('storeManagement');
  }, [switchModule]);

  return (
    <BrowserContext.Provider value={browserValue}>
      <CredentialErrorProvider onNavigateToSettings={navigateToStoreManagement}>
        <AntLayout style={{ height: '100vh' }}>
          <Header style={{ padding: '0 12px', height: 48, lineHeight: '48px', background: '#fafafa', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center' }}>
            <Tabs
              activeKey={activeModule}
              onChange={(key) => switchModule(key as ModuleType)}
              items={MODULES.map(m => ({
                key: m.key,
                label: (
                  <span onMouseEnter={() => void preloadByModule[m.key]()} onFocus={() => void preloadByModule[m.key]()}>
                    {m.label}
                  </span>
                ),
              }))}
              size="small"
              style={{ flex: 1, minWidth: 0 }}
              tabBarStyle={{ margin: 0 }}
            />
            <span
              onClick={handleVersionClick}
              style={{ color: '#bbb', fontSize: 12, whiteSpace: 'nowrap', marginLeft: 8, cursor: 'pointer' }}
            >
              v{version}
            </span>
          </Header>
          <AntLayout>
            {/* 账户侧边栏 — 仅账户模块显示 */}
            {isAccountModule && (
              <AccountSider
                accounts={accounts}
                activeAccountId={activeAccountId}
                activeModule={activeModule}
                listingScope={listingScope}
                setListingScope={setListingScope}
                switchAccount={switchAccount}
              />
            )}
            <Content style={{ padding: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {!activeModuleMounted && (
                <PageFallback />
              )}
              {mountedModules.includes('orders') && (
                <Suspense fallback={activeModule === 'orders' ? <PageFallback /> : null}>
                  <div style={{ flex: 1, minHeight: 0, display: activeModule === 'orders' ? 'flex' : 'none', flexDirection: 'column' }}>
                    <AccountModuleContent accounts={accounts} activeAccountId={activeAccountId} listingScope={listingScope} module="orders" />
                  </div>
                </Suspense>
              )}
              {mountedModules.includes('commonFunctions') && (
                <Suspense fallback={activeModule === 'commonFunctions' ? <PageFallback /> : null}>
                  <div style={{ flex: 1, minHeight: 0, display: activeModule === 'commonFunctions' ? 'flex' : 'none', flexDirection: 'column' }}>
                    <AccountModuleContent accounts={accounts} activeAccountId={activeAccountId} listingScope={listingScope} module="commonFunctions" />
                  </div>
                </Suspense>
              )}
              {mountedModules.includes('violation') && (
                <Suspense fallback={activeModule === 'violation' ? <PageFallback /> : null}>
                  <div style={{ flex: 1, minHeight: 0, display: activeModule === 'violation' ? 'flex' : 'none', flexDirection: 'column' }}>
                    <AccountModuleContent accounts={accounts} activeAccountId={activeAccountId} listingScope={listingScope} module="violation" />
                  </div>
                </Suspense>
              )}
              {mountedModules.includes('storeManagement') && (
                <Suspense fallback={activeModule === 'storeManagement' ? <PageFallback /> : null}>
                  <div style={{ flex: 1, minHeight: 0, display: activeModule === 'storeManagement' ? 'flex' : 'none', flexDirection: 'column' }}>
                    <StoreManagement
                      accounts={accounts}
                      addAccount={addAccount}
                      updateAccount={updateAccount}
                      removeAccount={removeAccount}
                      switchAccount={switchAccount}
                      activeAccountId={activeAccountId}
                    />
                  </div>
                </Suspense>
              )}
              {mountedModules.includes('scheduledJobs') && (
                <Suspense fallback={activeModule === 'scheduledJobs' ? <PageFallback /> : null}>
                  <div style={{ flex: 1, minHeight: 0, display: activeModule === 'scheduledJobs' ? 'flex' : 'none', flexDirection: 'column' }}>
                    <ScheduledJobsPage accounts={accounts} />
                  </div>
                </Suspense>
              )}
              {mountedModules.includes('settings') && (
                <Suspense fallback={activeModule === 'settings' ? <PageFallback /> : null}>
                  <div style={{ flex: 1, minHeight: 0, display: activeModule === 'settings' ? 'flex' : 'none', flexDirection: 'column' }}>
                    <SettingsPage defaultTab={settingsTab as 'about' | 'product' | 'contact'} />
                  </div>
                </Suspense>
              )}
            </Content>
          </AntLayout>
          <NotificationCenter />
          <GlobalLogDrawer />
        </AntLayout>
      </CredentialErrorProvider>
    </BrowserContext.Provider>
  );
};

export default Layout;
