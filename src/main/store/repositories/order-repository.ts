import type {
  FullAccount,
  LinkedPlatformOrder,
  OrderAddressInfo,
  OrderAssociation,
  OrderRealAddressCache,
  ProductSourceBinding,
  ProductSourceItem,
} from '../../../shared/types';

export interface OrderRepositoryDeps {
  getAccounts: () => FullAccount[];
  setAccounts: (accounts: FullAccount[]) => void;
  now: () => number;
  createId: () => string;
}

export interface OrderRepository {
  getProductSources: (accountId: string) => ProductSourceBinding[];
  setProductSources: (accountId: string, productId: string, sources: ProductSourceItem[]) => ProductSourceBinding;
  removeProductSource: (accountId: string, productId: string, sourceId: string) => ProductSourceBinding;
  getOrderAssociations: (accountId: string) => OrderAssociation[];
  setOrderAssociation: (accountId: string, orderId: string, input: Pick<OrderAssociation, 'internalRemark' | 'linkedOrders'>) => OrderAssociation;
  getRealAddressCaches: (accountId: string) => OrderRealAddressCache[];
  getRealAddressCache: (accountId: string, orderId: string) => OrderRealAddressCache | null;
  setRealAddressCache: (accountId: string, orderId: string, address: OrderAddressInfo) => OrderRealAddressCache;
}

function findAccount(accounts: FullAccount[], accountId: string): { account: FullAccount | undefined; index: number } {
  const index = accounts.findIndex(account => account.id === accountId);
  return { account: index === -1 ? undefined : accounts[index], index };
}

function normalizeLinkedOrder(order: Partial<LinkedPlatformOrder>, now: number, createId: () => string): LinkedPlatformOrder {
  return {
    id: order.id || createId(),
    platform: order.platform || 'taobao',
    platformOrderId: order.platformOrderId?.trim() || '',
    platformOrderStatus: order.platformOrderStatus?.trim() || '',
    logisticsStatus: order.logisticsStatus?.trim() || '',
    logisticsCompany: order.logisticsCompany?.trim() || '',
    trackingNumber: order.trackingNumber?.trim() || '',
    remark: order.remark?.trim() || '',
    createdAt: order.createdAt || now,
    updatedAt: now,
  };
}

export function createOrderRepository(deps: OrderRepositoryDeps): OrderRepository {
  const getAccount = (accountId: string): FullAccount | undefined => {
    return deps.getAccounts().find(account => account.id === accountId);
  };

  return {
    getProductSources(accountId) {
      return getAccount(accountId)?.productSources || [];
    },

    setProductSources(accountId, productId, sources) {
      const now = deps.now();
      const normalizedSources: ProductSourceItem[] = sources
        .map(source => ({
          id: source.id || deps.createId(),
          url: source.url.trim(),
          quantity: Number.isFinite(source.quantity) && source.quantity > 0 ? source.quantity : 1,
          remark: source.remark.trim(),
          createdAt: source.createdAt || now,
          updatedAt: now,
        }))
        .filter(source => source.url);
      const binding: ProductSourceBinding = { productId, sources: normalizedSources };

      const accounts = deps.getAccounts();
      const { account, index } = findAccount(accounts, accountId);
      if (!account) return binding;
      const existing = account.productSources || [];
      const nextAccount: FullAccount = {
        ...account,
        productSources: normalizedSources.length > 0
          ? [...existing.filter(item => item.productId !== productId), binding]
          : existing.filter(item => item.productId !== productId),
      };
      deps.setAccounts(accounts.map((item, itemIndex) => itemIndex === index ? nextAccount : item));
      return binding;
    },

    removeProductSource(accountId, productId, sourceId) {
      const sources = this.getProductSources(accountId)
        .find(item => item.productId === productId)
        ?.sources
        .filter(source => source.id !== sourceId) || [];
      return this.setProductSources(accountId, productId, sources);
    },

    getOrderAssociations(accountId) {
      return getAccount(accountId)?.orderAssociations || [];
    },

    setOrderAssociation(accountId, orderId, input) {
      const now = deps.now();
      const existing = this.getOrderAssociations(accountId).find(item => item.orderId === orderId);
      const linkedOrders = input.linkedOrders
        .map(order => normalizeLinkedOrder(order, now, deps.createId))
        .filter(order => order.platformOrderId || order.platformOrderStatus || order.logisticsStatus || order.logisticsCompany || order.trackingNumber || order.remark);
      const association: OrderAssociation = {
        orderId,
        internalRemark: input.internalRemark.trim(),
        linkedOrders,
        createdAt: existing?.createdAt || now,
        updatedAt: now,
      };

      const accounts = deps.getAccounts();
      const { account, index } = findAccount(accounts, accountId);
      if (!account) return association;
      const associations = account.orderAssociations || [];
      const hasContent = association.internalRemark || association.linkedOrders.length > 0;
      const nextAccount: FullAccount = {
        ...account,
        orderAssociations: hasContent
          ? [...associations.filter(item => item.orderId !== orderId), association]
          : associations.filter(item => item.orderId !== orderId),
      };
      deps.setAccounts(accounts.map((item, itemIndex) => itemIndex === index ? nextAccount : item));
      return association;
    },

    getRealAddressCaches(accountId) {
      return getAccount(accountId)?.realAddressCaches || [];
    },

    getRealAddressCache(accountId, orderId) {
      return this.getRealAddressCaches(accountId).find(item => item.orderId === orderId) || null;
    },

    setRealAddressCache(accountId, orderId, address) {
      const now = deps.now();
      const cache: OrderRealAddressCache = {
        orderId,
        address,
        fetchedAt: now,
        updatedAt: now,
      };
      const accounts = deps.getAccounts();
      const { account, index } = findAccount(accounts, accountId);
      if (!account) return cache;
      const caches = account.realAddressCaches || [];
      const nextAccount: FullAccount = {
        ...account,
        realAddressCaches: [...caches.filter(item => item.orderId !== orderId), cache],
      };
      deps.setAccounts(accounts.map((item, itemIndex) => itemIndex === index ? nextAccount : item));
      return cache;
    },
  };
}

