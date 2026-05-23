// Shared types across main process, preload, and renderer
export type { Account, Config, FullAccount } from './accounts';
export type { LicenseActivationInput, LicenseState, LicensedFeature } from './license';
export type {
  ScheduledJob,
  ScheduledJobModule,
  ScheduledJobRunStats,
  ScheduledJobScope,
  ScheduledJobStatus,
  ScheduledJobType,
  ScheduledTask,
} from './scheduling';

export type {
  AddLogFn,
  BlacklistRule,
  DraftProduct,
  ErrorCodeSummary,
  LogEntry,
  QuotaResult,
  StatusAction,
  StatusRule,
  TaskConfig,
  TaskCycleResult,
} from './listing';
export type { ViolationMatch, ViolationScanResult } from './violations';

export type {
  CheckoutAddressFillResult,
  DeliveryCompanyOption,
  LinkedOrderPlatform,
  LinkedPlatformOrder,
  Order,
  OrderAddressInfo,
  OrderAssociation,
  OrderDeliveryInfo,
  OrderDeliveryProductInfo,
  OrderDetail,
  OrderExtInfo,
  OrderListParams,
  OrderListResult,
  OrderPayInfo,
  OrderPriceInfo,
  OrderProductInfo,
  OrderRealAddressCache,
  OrderSearchParams,
  OrderSettleInfo,
  OrderSkuAttr,
  OrderTimeScope,
  OrderVirtualNumberInfo,
  ProductSourceBinding,
  ProductSourceItem,
  PurchaseLookupAutomationInput,
  PurchaseLookupAutomationResult,
  PurchaseShipmentCheckStatus,
  ShipOrderFromPurchaseInput,
  ShipOrderFromPurchaseResult,
  ShippingAssistantSession,
  TaobaoPurchaseOrderSnapshot,
  TaobaoRefundAutomationInput,
  TaobaoRefundAutomationResult,
  TaobaoRefundPrepareSnapshot,
  TaobaoSecurityChallengeKind,
  TaobaoSecurityChallengeSnapshot,
} from './orders';
export { OrderStatus } from './orders';
