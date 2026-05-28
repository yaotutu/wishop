import type {
  LocalOrderListResult,
  Order,
  OrderListFilters,
  OrderRefreshResult,
  OrderScope,
  OrderSearchParams,
  OrderSyncAccountState,
  OrderSyncState,
  StoredOrderSnapshot,
  StoredOrderSource,
} from '../../shared/types';
import { readStore, writeStore } from '../store';
import { buildOrderIndexedText, orderMatchesSearch } from './order-index';

const DEFAULT_ORDER_PAGE_SIZE = 50;

export interface OrderUpsertResult {
  snapshots: StoredOrderSnapshot[];
  fetchedCount: number;
  changedCount: number;
}

interface ExistingOrderForUpsert {
  order: Order;
  status: number;
  updateTime: number;
  indexedText: string;
}

interface ResolvedOrderUpsert {
  order: Order;
  indexedText: string;
  changed: boolean;
}

function isIncomingOrderStale(order: Order, previousUpdateTime?: number): boolean {
  const incomingUpdateTime = order.update_time || 0;
  return incomingUpdateTime > 0 && !!previousUpdateTime && incomingUpdateTime < previousUpdateTime;
}

function resolveOrderUpsert(order: Order, previous?: ExistingOrderForUpsert): ResolvedOrderUpsert {
  const indexedText = buildOrderIndexedText(order);
  if (!previous) return { order, indexedText, changed: true };
  if (isIncomingOrderStale(order, previous.order.update_time)) {
    return { order: previous.order, indexedText: previous.indexedText, changed: false };
  }
  return {
    order,
    indexedText,
    changed: previous.status !== order.status
      || previous.updateTime !== order.update_time
      || previous.indexedText !== indexedText,
  };
}

function scopeKey(scope: OrderScope): string {
  return scope.type === 'account' ? `account:${scope.accountId}` : 'all';
}

function sortSnapshots(snapshots: StoredOrderSnapshot[]): StoredOrderSnapshot[] {
  return [...snapshots].sort((a, b) => (
    (b.order.update_time || 0) - (a.order.update_time || 0)
    || (b.order.create_time || 0) - (a.order.create_time || 0)
    || b.lastFetchedAt - a.lastFetchedAt
  ));
}

function matchesScope(snapshot: StoredOrderSnapshot, scope: OrderScope): boolean {
  return scope.type === 'all' || snapshot.accountId === scope.accountId;
}

function minCreateTime(filters: OrderListFilters): number | null {
  const scope = filters.timeScope || 'all';
  if (scope === 'all') return null;
  const days = Number(scope.replace('d', ''));
  if (!Number.isFinite(days)) return null;
  const nowSeconds = filters.nowSeconds ?? Math.floor(Date.now() / 1000);
  return nowSeconds - days * 24 * 60 * 60;
}

function matchesFilters(snapshot: StoredOrderSnapshot, filters: OrderListFilters): boolean {
  if (filters.status !== undefined && snapshot.order.status !== filters.status) return false;
  const minTime = minCreateTime(filters);
  if (minTime !== null && snapshot.order.create_time < minTime) return false;
  if (filters.search?.keyword?.trim() && !orderMatchesSearch(snapshot.order, snapshot.indexedText, filters.search)) return false;
  return true;
}

function paginate(snapshots: StoredOrderSnapshot[], filters: OrderListFilters): LocalOrderListResult {
  const pageSize = Math.max(1, filters.pageSize || snapshots.length || DEFAULT_ORDER_PAGE_SIZE);
  const start = Math.max(0, Number(filters.cursor || 0) || 0);
  const end = start + pageSize;
  const page = snapshots.slice(start, end);
  return {
    orders: page,
    hasMore: end < snapshots.length,
    total: snapshots.length,
    nextCursor: end < snapshots.length ? String(end) : undefined,
  };
}

function readSnapshots(): StoredOrderSnapshot[] {
  return readStore().orderSnapshots || [];
}

function writeSnapshots(snapshots: StoredOrderSnapshot[]): void {
  writeStore({ orderSnapshots: snapshots });
}

function readSyncStates(): Record<string, OrderSyncAccountState> {
  return readStore().orderSyncStates || {};
}

function writeSyncStates(syncStates: Record<string, OrderSyncAccountState>): void {
  writeStore({ orderSyncStates: syncStates });
}

export function createOrderStore(options: { maxOrdersPerAccount?: number; now?: () => number } = {}) {
  const maxOrdersPerAccount = options.maxOrdersPerAccount;
  const now = options.now || Date.now;

  function limitPerAccount(snapshots: StoredOrderSnapshot[]): StoredOrderSnapshot[] {
    if (!maxOrdersPerAccount || maxOrdersPerAccount <= 0) return snapshots;
    const grouped = new Map<string, StoredOrderSnapshot[]>();
    for (const snapshot of snapshots) {
      grouped.set(snapshot.accountId, [...(grouped.get(snapshot.accountId) || []), snapshot]);
    }
    return [...grouped.values()].flatMap(items => sortSnapshots(items).slice(0, maxOrdersPerAccount));
  }

  async function upsertMany(
    accountId: string,
    accountName: string,
    orders: Order[],
    source: StoredOrderSource,
  ): Promise<OrderUpsertResult> {
    const currentByKey = new Map(readSnapshots().map(snapshot => [`${snapshot.accountId}:${snapshot.orderId}`, snapshot]));
    const fetchedAt = now();
    let fetchedCount = 0;
    let changedCount = 0;

    for (const order of orders) {
      const orderId = String(order.order_id || '').trim();
      if (!orderId) continue;
      fetchedCount += 1;
      const key = `${accountId}:${orderId}`;
      const previous = currentByKey.get(key);
      const resolved = resolveOrderUpsert(order, previous ? {
        order: previous.order,
        status: previous.order.status,
        updateTime: previous.order.update_time,
        indexedText: previous.indexedText,
      } : undefined);
      if (resolved.changed) changedCount += 1;
      currentByKey.set(key, {
        accountId,
        accountName,
        orderId,
        order: resolved.order,
        indexedText: resolved.indexedText,
        lastFetchedAt: fetchedAt,
        lastChangedAt: resolved.changed || !previous ? fetchedAt : previous.lastChangedAt,
        source,
      });
    }

    const snapshots = limitPerAccount([...currentByKey.values()]);
    writeSnapshots(snapshots);
    return {
      snapshots: snapshots.filter(snapshot => snapshot.accountId === accountId),
      fetchedCount,
      changedCount,
    };
  }

  async function list(scope: OrderScope, filters: OrderListFilters = {}): Promise<LocalOrderListResult> {
    const snapshots = sortSnapshots(readSnapshots())
      .filter(snapshot => matchesScope(snapshot, scope))
      .filter(snapshot => matchesFilters(snapshot, filters));
    return paginate(snapshots, filters);
  }

  async function search(scope: OrderScope, params: OrderSearchParams): Promise<LocalOrderListResult> {
    return list(scope, { search: params, pageSize: params.page_size });
  }

  async function get(accountId: string, orderId: string): Promise<StoredOrderSnapshot | null> {
    return readSnapshots().find(snapshot => snapshot.accountId === accountId && snapshot.orderId === orderId) || null;
  }

  async function markSyncStarted(scope: OrderScope): Promise<void> {
    const syncStates = readSyncStates();
    const startedAt = now();
    const key = scopeKey(scope);
    syncStates[key] = {
      ...syncStates[key],
      accountId: scope.type === 'account' ? scope.accountId : key,
      running: true,
      lastStartedAt: startedAt,
      lastError: '',
    };
    writeSyncStates(syncStates);
  }

  async function markSyncFinished(scope: OrderScope, result: OrderRefreshResult): Promise<void> {
    const syncStates = readSyncStates();
    const key = scopeKey(scope);
    syncStates[key] = {
      ...syncStates[key],
      accountId: scope.type === 'account' ? scope.accountId : key,
      running: false,
      lastFinishedAt: result.finishedAt,
      lastSuccessAt: result.failedAccounts.length === 0 ? result.finishedAt : syncStates[key]?.lastSuccessAt,
      lastError: result.failedAccounts.map(item => `${item.accountName || item.accountId}: ${item.error}`).join('; '),
      nextSyncAt: result.finishedAt + 60_000,
    };
    writeSyncStates(syncStates);
  }

  async function getSyncState(scope: OrderScope): Promise<OrderSyncState> {
    const syncStates = readSyncStates();
    const direct = syncStates[scopeKey(scope)];
    const accountStates = Object.entries(syncStates)
      .filter(([key]) => key.startsWith('account:'))
      .map(([, value]) => value);
    return {
      scope,
      running: direct?.running || accountStates.some(item => item.running),
      lastStartedAt: direct?.lastStartedAt,
      lastFinishedAt: direct?.lastFinishedAt,
      lastSuccessAt: direct?.lastSuccessAt,
      lastError: direct?.lastError,
      nextSyncAt: direct?.nextSyncAt,
      accountStates: scope.type === 'account'
        ? accountStates.filter(item => item.accountId === scope.accountId)
        : accountStates,
    };
  }

  return {
    upsertMany,
    list,
    search,
    get,
    markSyncStarted,
    markSyncFinished,
    getSyncState,
  };
}

export type OrderStore = ReturnType<typeof createOrderStore>;
export const orderStore = createOrderStore();
