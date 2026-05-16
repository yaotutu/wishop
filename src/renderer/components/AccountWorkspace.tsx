import React from 'react';
import ListingPage from '../pages/common-functions/ListingPage';
import OrdersPage from '../pages/orders/OrdersPage';
import ViolationPage from '../pages/violation/ViolationPage';

export type AccountModuleType = 'orders' | 'commonFunctions' | 'violation';

interface AccountWorkspaceProps {
  accountId: string;
  activeModule: AccountModuleType;
}

const AccountWorkspace: React.FC<AccountWorkspaceProps> = ({ accountId, activeModule }) => (
  <>
    <div style={{ height: '100%', display: activeModule === 'orders' ? 'flex' : 'none', flexDirection: 'column' }}>
      <OrdersPage accountId={accountId} />
    </div>
    <div style={{ height: '100%', display: activeModule === 'commonFunctions' ? 'flex' : 'none', flexDirection: 'column' }}>
      <ListingPage accountId={accountId} />
    </div>
    <div style={{ height: '100%', display: activeModule === 'violation' ? 'flex' : 'none', flexDirection: 'column' }}>
      <ViolationPage accountId={accountId} />
    </div>
  </>
);

export default AccountWorkspace;
