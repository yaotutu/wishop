import type { LogEntry, TaskConfig } from './listing';
import type { OrderAssociation, OrderRealAddressCache, ProductSourceBinding } from './orders';
import type { ScheduledTask } from './scheduling';

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
  schedulers: ScheduledTask[];
  taskConfig: TaskConfig;
  logs: LogEntry[];
  violationWords: string[];
  productSources: ProductSourceBinding[];
  orderAssociations: OrderAssociation[];
  realAddressCaches: OrderRealAddressCache[];
  createdAt: number;
}
