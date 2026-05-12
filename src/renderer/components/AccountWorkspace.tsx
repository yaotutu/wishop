import React from 'react';
import ListingPage from '../pages/common-functions/ListingPage';
import OrdersPage from '../pages/orders/OrdersPage';
import SettingsPage from '../pages/settings/SettingsPage';

export type AccountModuleType = 'orders' | 'commonFunctions' | 'settings';

interface AccountWorkspaceProps {
  accountId: string;
  activeModule: AccountModuleType;
}

const AccountWorkspace: React.FC<AccountWorkspaceProps> = ({ accountId, activeModule }) => {
  switch (activeModule) {
    case 'orders':
      return <OrdersPage accountId={accountId} />;
    case 'commonFunctions':
      return <ListingPage accountId={accountId} />;
    case 'settings':
      return <SettingsPage accountId={accountId} />;
    default:
      return null;
  }
};

export default AccountWorkspace;
