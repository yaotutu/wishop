import type { ListingRulesConfig, LogEntry, TaskConfig } from './listing';
import type { OrderAssociation, OrderRealAddressCache, ProductSourceBinding } from './orders';

export interface Config {
  appId: string;
  appSecret: string;
}

export interface Account {
  id: string;
  name: string;
  config: Config;
  createdAt: number;
}

export interface FullAccount {
  id: string;
  name: string;
  config: Config;
  taskConfig: TaskConfig;
  listingSettings?: {
    useAccountTaskConfig?: boolean;
    useAccountRules?: boolean;
    globalScheduledEnabled?: boolean;
  };
  listingRules?: ListingRulesConfig;
  logs: LogEntry[];
  violationWords: string[];
  productSources: ProductSourceBinding[];
  orderAssociations: OrderAssociation[];
  realAddressCaches: OrderRealAddressCache[];
  createdAt: number;
}
