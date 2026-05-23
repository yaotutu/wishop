/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Account } from '../../shared/types';
import { AccountSider } from './Layout';

const accounts: Account[] = [{
  id: 'account-1',
  name: '全部账号',
  config: { appId: 'app', appSecret: 'secret' },
  createdAt: 1,
}];

describe('AccountSider', () => {
  afterEach(() => {
    cleanup();
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
});
