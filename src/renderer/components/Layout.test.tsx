/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Account } from '../../shared/types';

const mocks = vi.hoisted(() => ({
  fetchAccounts: vi.fn(),
  openTaobaoBrowser: vi.fn(),
}));

vi.mock('../domains/accounts/hooks', () => ({
  useAccounts: () => ({
    accounts: [{
      id: 'account-1',
      name: '全部账号',
      config: { appId: 'app', appSecret: 'secret' },
      createdAt: 1,
    }],
    activeAccountId: 'account-1',
    fetchAccounts: mocks.fetchAccounts,
    addAccount: vi.fn(),
    removeAccount: vi.fn(),
    updateAccount: vi.fn(),
    switchAccount: vi.fn(),
  }),
}));

vi.mock('../domains/browser/hooks', () => ({
  useBrowser: () => ({
    openTaobaoBrowser: mocks.openTaobaoBrowser,
    openBrowser: vi.fn(),
    openCleanBrowser: vi.fn(),
    openShippingAssistant: vi.fn(),
  }),
}));

vi.mock('../pages/orders/OrdersPage', () => ({ default: () => <div>订单管理页</div> }));
vi.mock('./NotificationCenter', () => ({ default: () => null }));
vi.mock('./GlobalLogDrawer', () => ({ default: () => null }));

const { default: Layout, AccountSider } = await import('./Layout');

const accounts: Account[] = [{
  id: 'account-1',
  name: '全部账号',
  config: { appId: 'app', appSecret: 'secret' },
  createdAt: 1,
}];

describe('AccountSider', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('separates the global listing scope from account entries', () => {
    render(
      <AccountSider
        accounts={accounts}
        activeAccountId="account-1"
        activeModule="commonFunctions"
        listingScope="global"
        setListingScope={vi.fn()}
        switchAccount={vi.fn()}
      />,
    );

    const globalSection = screen.getByTestId('listing-global-scope-section');
    const accountSection = screen.getByTestId('account-list-section');

    expect(within(globalSection).getByText('全局范围')).toBeTruthy();
    expect(within(globalSection).getByTestId('listing-global-scope').textContent).toContain('全部账号');
    expect(within(accountSection).getByText('店铺账号')).toBeTruthy();
    expect(within(accountSection).getByText('1. 全部账号')).toBeTruthy();
  });

  it('opens the shared Taobao browser from the tab bar action', async () => {
    class ResizeObserverStub {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    Object.defineProperty(window, 'ResizeObserver', {
      configurable: true,
      value: ResizeObserverStub,
    });
    Object.defineProperty(window, 'appVersion', {
      configurable: true,
      value: { get: vi.fn().mockResolvedValue('0.0.44') },
    });

    render(<Layout />);

    await waitFor(() => expect(mocks.fetchAccounts).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: /淘宝浏览器/ }));

    expect(mocks.openTaobaoBrowser).toHaveBeenCalledOnce();
  });
});
