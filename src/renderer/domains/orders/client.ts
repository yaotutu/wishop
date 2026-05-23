import type {
  DeliveryCompanyOption,
  Order,
  OrderAddressInfo,
  OrderAssociation,
  OrderRealAddressCache,
  OrderSearchParams,
  OrderStatus,
  OrderTimeScope,
  ProductSourceBinding,
  ProductSourceItem,
  PurchaseLookupAutomationInput,
  PurchaseLookupAutomationResult,
  ShipOrderFromPurchaseInput,
  ShipOrderFromPurchaseResult,
  TaobaoRefundAutomationInput,
  TaobaoRefundAutomationResult,
} from '../../../shared/orders';

export const ordersClient = {
  list(accountId: string, status?: OrderStatus, pageSize = 50, reset = true, timeScope: OrderTimeScope = 'all'): Promise<{ orders: Order[]; hasMore: boolean }> {
    return window.wishop.orders.list(accountId, status, pageSize, reset, timeScope);
  },
  detail(accountId: string, orderId: string): Promise<Order | null> {
    return window.wishop.orders.detail(accountId, orderId);
  },
  search(accountId: string, params: OrderSearchParams): Promise<{ orders: Order[]; hasMore: boolean }> {
    return window.wishop.orders.search(accountId, params);
  },
  decodeAddress(accountId: string, orderId: string): Promise<OrderAddressInfo> {
    return window.wishop.orders.decodeAddress(accountId, orderId);
  },
  productSources: {
    list(accountId: string): Promise<ProductSourceBinding[]> {
      return window.wishop.productSources.list(accountId);
    },
    save(accountId: string, productId: string, sources: ProductSourceItem[]): Promise<ProductSourceBinding> {
      return window.wishop.productSources.set(accountId, productId, sources);
    },
  },
  associations: {
    list(accountId: string): Promise<OrderAssociation[]> {
      return window.wishop.orderAssociations.list(accountId);
    },
    save(accountId: string, orderId: string, input: Pick<OrderAssociation, 'internalRemark' | 'linkedOrders'>): Promise<OrderAssociation> {
      return window.wishop.orderAssociations.set(accountId, orderId, input);
    },
  },
  realAddresses: {
    list(accountId: string): Promise<OrderRealAddressCache[]> {
      return window.wishop.orderRealAddresses.list(accountId);
    },
    fetch(accountId: string, orderId: string, refresh: boolean): Promise<OrderRealAddressCache> {
      return refresh
        ? window.wishop.orderRealAddresses.refresh(accountId, orderId)
        : window.wishop.orderRealAddresses.fetch(accountId, orderId);
    },
  },
  delivery: {
    listCompanies(accountId: string): Promise<DeliveryCompanyOption[]> {
      return window.wishop.orders.listDeliveryCompanies(accountId);
    },
    shipFromPurchase(input: ShipOrderFromPurchaseInput): Promise<ShipOrderFromPurchaseResult> {
      return window.wishop.orders.shipFromPurchase(input);
    },
  },
  taobao: {
    lookupPurchase(input: PurchaseLookupAutomationInput): Promise<PurchaseLookupAutomationResult> {
      return window.wishop.taobaoAutomation.lookupPurchase(input);
    },
    prepareRefund(input: TaobaoRefundAutomationInput): Promise<TaobaoRefundAutomationResult> {
      return window.wishop.taobaoAutomation.prepareRefund(input);
    },
    fillCheckoutAddress(address: OrderAddressInfo) {
      return window.wishop.taobaoAutomation.fillCheckoutAddress(address);
    },
  },
};
