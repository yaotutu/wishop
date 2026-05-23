import Store from 'electron-store';
import { v4 as uuidv4 } from 'uuid';
import type {
  BlacklistRule,
  FullAccount,
  LicenseState,
  ScheduledJob,
  StatusRule,
} from '../../shared/types';
import type { GlobalLogEntry } from '../../shared/global-log';
import type { NotificationEntry, NotificationPreference } from '../../shared/notification';
import type { AppSettings } from '../../shared/settings';
import { DEFAULT_APP_SETTINGS } from '../../shared/settings';
import type { CredentialMeta } from '../../shared/credentials';
import type { SyncSettings } from '../../shared/sync';
import { DEFAULT_SYNC_SETTINGS } from '../../shared/sync';
import { createAccountRepository } from './repositories/account-repository';
import { createAppSettingsRepository } from './repositories/app-settings-repository';
import { createGlobalEventRepository } from './repositories/global-event-repository';
import { createLicenseRepository } from './repositories/license-repository';
import { createListingRepository } from './repositories/listing-repository';
import { createOrderRepository } from './repositories/order-repository';
import { createScheduledJobRepository } from './repositories/scheduled-job-repository';
import { createSyncCredentialRepository } from './repositories/sync-credential-repository';
import { createViolationRepository } from './repositories/violation-repository';

export interface StoreSchema {
  accounts: FullAccount[];
  activeAccountId: string;
  skipKeywords?: string[];
  blacklistRules?: BlacklistRule[];
  statusRules?: StatusRule[];
  licenseState?: LicenseState;
  scheduledJobs?: ScheduledJob[];
  globalLogs?: GlobalLogEntry[];
  notifications?: NotificationEntry[];
  notificationPreference?: NotificationPreference;
  appSettings?: AppSettings;
  syncSettings?: SyncSettings;
  credentialMetas?: CredentialMeta[];
}

let logCounter = 0;

const store = new Store<StoreSchema>({
  defaults: {
    accounts: [],
    activeAccountId: '',
    appSettings: DEFAULT_APP_SETTINGS,
    syncSettings: DEFAULT_SYNC_SETTINGS,
    credentialMetas: [],
  },
});

export const accountRepository = createAccountRepository({
  getAccounts: () => store.get('accounts'),
  setAccounts: accounts => store.set('accounts', accounts),
  getActiveAccountId: () => store.get('activeAccountId'),
  setActiveAccountId: accountId => store.set('activeAccountId', accountId),
  createId: () => uuidv4(),
  now: () => Date.now(),
  env: process.env,
});

export const orderRepository = createOrderRepository({
  getAccounts: () => store.get('accounts'),
  setAccounts: accounts => store.set('accounts', accounts),
  now: () => Date.now(),
  createId: () => uuidv4(),
});

export const listingRepository = createListingRepository({
  getAccounts: () => store.get('accounts'),
  setAccounts: accounts => store.set('accounts', accounts),
  getGlobal: <T,>(key: string) => store.get(key as keyof StoreSchema) as T | undefined,
  setGlobal: (key, value) => store.set(key as keyof StoreSchema, value as never),
  now: () => Date.now(),
  createId: () => `${Date.now()}-${++logCounter}`,
});

export const violationRepository = createViolationRepository({
  getAccounts: () => store.get('accounts'),
  setAccounts: accounts => store.set('accounts', accounts),
});

export const scheduledJobRepository = createScheduledJobRepository({
  getJobs: () => store.get('scheduledJobs') || [],
  setJobs: jobs => store.set('scheduledJobs', jobs),
  createId: () => uuidv4(),
  now: () => Date.now(),
});

export const licenseRepository = createLicenseRepository({
  getLicenseState: () => store.get('licenseState'),
  setLicenseState: state => store.set('licenseState', state),
  createId: () => uuidv4(),
});

export const globalEventRepository = createGlobalEventRepository({
  getGlobalLogs: () => store.get('globalLogs') || [],
  setGlobalLogs: logs => store.set('globalLogs', logs),
  getNotifications: () => store.get('notifications') || [],
  setNotifications: notifications => store.set('notifications', notifications),
  getNotificationPreference: () => store.get('notificationPreference'),
  setNotificationPreference: preference => store.set('notificationPreference', preference),
  createId: () => uuidv4(),
  now: () => Date.now(),
});

export const appSettingsRepository = createAppSettingsRepository({
  getSettings: () => store.get('appSettings'),
  setSettings: settings => store.set('appSettings', settings),
});

export const syncCredentialRepository = createSyncCredentialRepository({
  getSyncSettings: () => store.get('syncSettings'),
  setSyncSettings: settings => store.set('syncSettings', settings),
  getCredentialMetas: () => store.get('credentialMetas') || [],
  setCredentialMetas: metas => store.set('credentialMetas', metas),
  now: () => Date.now(),
});

export default store;
