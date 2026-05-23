import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Order, OrderAssociation, ScheduledJob } from '../../shared/types';
import { OrderStatus } from '../../shared/types';

const mocks = vi.hoisted(() => ({
  cronHandler: undefined as (() => void) | undefined,
  cronTaskStop: vi.fn(),
  runTaskCycle: vi.fn(),
  batchScan: vi.fn(),
  getScheduledJobs: vi.fn(),
  addScheduledJob: vi.fn(),
  upsertScheduledJobSingleton: vi.fn(),
  normalizeScheduledJobSingletons: vi.fn(),
  getAccounts: vi.fn(() => [{ id: 'account-1' }]),
  getAppSettings: vi.fn(),
  getEffectiveBlacklistRules: vi.fn(() => []),
  getEffectiveSkipKeywords: vi.fn(() => []),
  getEffectiveStatusRules: vi.fn(() => []),
  getEffectiveTaskConfig: vi.fn(),
  getOrderAssociations: vi.fn(),
  getViolationWords: vi.fn(),
  runPurchaseLookupAutomation: vi.fn(),
  setOrderAssociation: vi.fn(),
  updateScheduledJob: vi.fn(),
  updateScheduledJobAccountStats: vi.fn(),
  updateScheduledJobStats: vi.fn(),
  getClient: vi.fn(),
}));

vi.mock('node-cron', () => ({
  validate: vi.fn(() => true),
  schedule: vi.fn((_expression: string, handler: () => void) => {
    mocks.cronHandler = handler;
    return { stop: mocks.cronTaskStop };
  }),
}));

vi.mock('../modules/task-cycle', () => ({
  runTaskCycle: mocks.runTaskCycle,
}));

vi.mock('../modules/violation-detect', () => ({
  batchScan: mocks.batchScan,
}));

vi.mock('../store', () => ({
  addScheduledJob: mocks.addScheduledJob,
  createScopedAddLog: vi.fn(() => vi.fn()),
  getAccounts: mocks.getAccounts,
  getAppSettings: mocks.getAppSettings,
  getBlacklistRules: vi.fn(() => []),
  getConfig: vi.fn(() => ({ appId: 'app-1', appSecret: 'secret-1' })),
  getEffectiveBlacklistRules: mocks.getEffectiveBlacklistRules,
  getEffectiveSkipKeywords: mocks.getEffectiveSkipKeywords,
  getEffectiveStatusRules: mocks.getEffectiveStatusRules,
  getEffectiveTaskConfig: mocks.getEffectiveTaskConfig,
  getOrderAssociations: mocks.getOrderAssociations,
  getScheduledJobs: mocks.getScheduledJobs,
  normalizeScheduledJobSingletons: mocks.normalizeScheduledJobSingletons,
  getSkipKeywords: vi.fn(() => []),
  getStatusRules: vi.fn(() => []),
  getViolationWords: mocks.getViolationWords,
  setOrderAssociation: mocks.setOrderAssociation,
  updateScheduledJob: mocks.updateScheduledJob,
  updateScheduledJobAccountStats: mocks.updateScheduledJobAccountStats,
  updateScheduledJobStats: mocks.updateScheduledJobStats,
  upsertScheduledJobSingleton: mocks.upsertScheduledJobSingleton,
}));

vi.mock('../wxshop/client-registry', () => ({
  getClient: mocks.getClient,
}));

mocks.getClient.mockImplementation(() => ({
    getAuditQuota: vi.fn(async () => ({ quota: 10 })),
  }));

vi.mock('../utils/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

vi.mock('../services/taobao-automation-service', () => ({
  runPurchaseLookupAutomation: mocks.runPurchaseLookupAutomation,
}));

const {
  resetScheduledJobDefinitionsForTests,
  startAllScheduledJobs,
  startScheduledJob,
  stopScheduledJob,
} = await import('./scheduled-job-runner');
const { registerCoreScheduledJobs } = await import('./scheduled-job-definitions');

function createScheduledJob(overrides: Partial<ScheduledJob> = {}): ScheduledJob {
  return {
    id: 'job-1',
    name: 'job',
    enabled: true,
    module: 'listing',
    jobType: 'listing.submitDrafts',
    scope: 'account',
    accountId: 'account-1',
    cronExpression: '* * * * *',
    payload: {},
    stats: { lastRunDate: '', todayRunCount: 0 },
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

function createOrder(orderId: string): Order {
  return {
    order_id: orderId,
    status: OrderStatus.PendingShipment,
    create_time: Math.floor(Date.now() / 1000),
    update_time: Math.floor(Date.now() / 1000),
    order_detail: {
      product_infos: [],
      price_info: {
        product_price: 0,
        order_price: 0,
        freight: 0,
        discounted_price: 0,
        original_order_price: 0,
        merchant_receieve_price: 0,
      },
      pay_info: { pay_time: 0, transaction_id: '', payment_method: 0 },
      delivery_info: {
        address_info: {
          user_name: '',
          postal_code: '',
          province_name: '',
          city_name: '',
          county_name: '',
          detail_info: '',
          tel_number: '',
          house_number: '',
        },
        delivery_product_info: [],
        ship_done_time: 0,
        deliver_method: 0,
      },
      ext_info: { customer_notes: '', merchant_notes: '', confirm_receipt_time: 0 },
    },
  };
}

function createAssociation(orderId: string): OrderAssociation {
  return {
    orderId,
    internalRemark: '',
    linkedOrders: [{
      id: `linked-${orderId}`,
      platform: 'taobao',
      platformOrderId: `tb-${orderId}`,
      platformOrderStatus: '买家已付款',
      logisticsStatus: '',
      logisticsCompany: '',
      trackingNumber: '',
      createdAt: 1,
      updatedAt: 1,
    }],
    createdAt: 1,
    updatedAt: 1,
  };
}

async function waitFor(assertion: () => void): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      assertion();
      return;
    } catch (error) {
      if (attempt === 99) throw error;
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }
}

describe('scheduled job runner', () => {
  beforeEach(() => {
    resetScheduledJobDefinitionsForTests();
    registerCoreScheduledJobs();
    vi.clearAllMocks();
    mocks.cronHandler = undefined;
    mocks.getAccounts.mockReturnValue([{ id: 'account-1' }]);
    mocks.normalizeScheduledJobSingletons.mockReturnValue([]);
    mocks.getAppSettings.mockReturnValue({
      shipmentCheck: {
        enabled: false,
        windowMinutes: 10,
        maxChecksPerAccountPerWindow: 5,
        minDispatchDelaySeconds: 0,
        maxDispatchDelaySeconds: 0,
        minTaskSpacingSeconds: 0,
        orderLookbackDays: 7,
        normalCooldownMinutes: 60,
        verificationCooldownMinutes: 360,
        failureCooldownMinutes: 60,
      },
    });
    mocks.getOrderAssociations.mockReturnValue([]);
    mocks.getViolationWords.mockReturnValue(['禁词']);
    mocks.upsertScheduledJobSingleton.mockImplementation((_singletonKey, input) => createScheduledJob(input));
    mocks.getEffectiveTaskConfig.mockReturnValue({ listUnreviewed: true, listUnreviewedQuantity: 4, autoDeleteFailed: false });
    mocks.getEffectiveBlacklistRules.mockReturnValue([{ code: 9001, description: '停止' }]);
    mocks.getEffectiveSkipKeywords.mockReturnValue(['保留']);
    mocks.getEffectiveStatusRules.mockReturnValue([{ editStatus: 72, label: '未审核', action: 'submit' }]);
    mocks.runTaskCycle.mockResolvedValue({ scanned: 0, deleted: 0, listed: 0, errors: 0, skipped: 0, stopped: false });
    mocks.batchScan.mockResolvedValue({ scanned: 0, violations: [], errors: 0, stopped: false });
    mocks.runPurchaseLookupAutomation.mockReset();
    mocks.setOrderAssociation.mockReset();
  });

  it('passes the job abort signal to listing jobs', async () => {
    const job = createScheduledJob({ id: 'listing-job' });
    mocks.getScheduledJobs.mockReturnValue([job]);
    mocks.runTaskCycle.mockImplementation(async (_api, _addLog, _taskConfig, _runId, signal?: AbortSignal) => {
      await new Promise<void>(resolve => signal?.addEventListener('abort', () => resolve(), { once: true }));
      return { scanned: 0, deleted: 0, listed: 0, errors: 0, skipped: 0, stopped: true };
    });

    startScheduledJob(job);
    mocks.cronHandler?.();

    await waitFor(() => expect(mocks.runTaskCycle).toHaveBeenCalled());
    expect(mocks.getClient).toHaveBeenCalledWith('account-1', { appId: 'app-1', appSecret: 'secret-1' });
    const signal = mocks.runTaskCycle.mock.calls[0][4] as AbortSignal | undefined;

    expect(signal).toBeDefined();

    stopScheduledJob(job.id);
    await waitFor(() => expect(signal?.aborted).toBe(true));
  });

  it('passes the job abort signal to violation scan jobs', async () => {
    const job = createScheduledJob({
      id: 'violation-job',
      module: 'violation',
      jobType: 'violation.scanProducts',
    });
    mocks.getScheduledJobs.mockReturnValue([job]);
    mocks.batchScan.mockImplementation(async (_api, _addLog, _words, _runId, signal?: AbortSignal) => {
      await new Promise<void>(resolve => signal?.addEventListener('abort', () => resolve(), { once: true }));
      return { scanned: 0, violations: [], errors: 0, stopped: true };
    });

    startScheduledJob(job);
    mocks.cronHandler?.();

    await waitFor(() => expect(mocks.batchScan).toHaveBeenCalled());
    const signal = mocks.batchScan.mock.calls[0][4] as AbortSignal | undefined;

    expect(signal).toBeDefined();

    stopScheduledJob(job.id);
    await waitFor(() => expect(signal?.aborted).toBe(true));
  });

  it('skips accounts that disabled global listing scheduled jobs', async () => {
    const job = createScheduledJob({
      id: 'global-listing-job',
      scope: 'global',
    });
    mocks.getAccounts.mockReturnValue([
      { id: 'account-1', globalListingScheduledEnabled: false },
      { id: 'account-2', globalListingScheduledEnabled: true },
    ] as any);
    mocks.getScheduledJobs.mockReturnValue([job]);

    startScheduledJob(job);
    mocks.cronHandler?.();

    await waitFor(() => expect(mocks.runTaskCycle).toHaveBeenCalledTimes(1));
    expect(mocks.getClient).toHaveBeenCalledWith('account-2', { appId: 'app-1', appSecret: 'secret-1' });
    expect(mocks.getClient).not.toHaveBeenCalledWith('account-1', expect.anything());
  });

  it('runs listing jobs with the account effective task config and rules', async () => {
    const job = createScheduledJob({
      id: 'global-listing-job',
      scope: 'global',
      payload: {},
    });
    mocks.getScheduledJobs.mockReturnValue([job]);

    startScheduledJob(job);
    mocks.cronHandler?.();

    await waitFor(() => expect(mocks.runTaskCycle).toHaveBeenCalled());
    expect(mocks.runTaskCycle.mock.calls[0][2]).toEqual({
      listUnreviewed: true,
      listUnreviewedQuantity: 4,
      autoDeleteFailed: false,
    });
    expect(mocks.runTaskCycle.mock.calls[0][6]).toEqual([{ code: 9001, description: '停止' }]);
    expect(mocks.runTaskCycle.mock.calls[0][7]).toEqual(['保留']);
    expect(mocks.runTaskCycle.mock.calls[0][8]).toEqual([{ editStatus: 72, label: '未审核', action: 'submit' }]);
  });

  it('continues checking later purchase orders when one Taobao lookup fails', async () => {
    vi.useFakeTimers();
    const job = createScheduledJob({
      id: 'shipment-job',
      module: 'orders',
      jobType: 'orders.checkShipmentStatus',
      scope: 'global',
    });
    const api = {
      getOrderList: vi.fn(async () => ({ order_id_list: ['order-1', 'order-2'] })),
      getOrderDetail: vi.fn(async (orderId: string) => createOrder(orderId)),
    };
    mocks.getScheduledJobs.mockReturnValue([job]);
    mocks.upsertScheduledJobSingleton.mockReturnValue(job);
    mocks.getAppSettings.mockReturnValue({
      shipmentCheck: {
        enabled: true,
        windowMinutes: 10,
        maxChecksPerAccountPerWindow: 5,
        minDispatchDelaySeconds: 0,
        maxDispatchDelaySeconds: 0,
        minTaskSpacingSeconds: 0,
        orderLookbackDays: 7,
        normalCooldownMinutes: 60,
        verificationCooldownMinutes: 360,
        failureCooldownMinutes: 60,
      },
    });
    mocks.getOrderAssociations.mockReturnValue([
      createAssociation('order-1'),
      createAssociation('order-2'),
    ]);
    mocks.getClient.mockReturnValue(api);
    mocks.runPurchaseLookupAutomation
      .mockRejectedValueOnce(new Error('淘宝页面需要人工处理：登录'))
      .mockResolvedValueOnce({ snapshot: { platformOrderId: 'tb-order-2' } });

    try {
      startAllScheduledJobs(() => ({ isDestroyed: () => false }) as any);
      mocks.cronHandler?.();
      await vi.runAllTimersAsync();

      expect(mocks.runPurchaseLookupAutomation).toHaveBeenCalledTimes(2);
      expect(mocks.runPurchaseLookupAutomation.mock.calls.map(call => call[1].orderId).sort()).toEqual(['order-1', 'order-2']);
      const waitingUserUpdates = mocks.setOrderAssociation.mock.calls.filter(call => (
        call[2].linkedOrders[0].lastShipmentCheckStatus === 'waiting_user'
      ));
      expect(waitingUserUpdates).toHaveLength(1);
      expect(['order-1', 'order-2']).toContain(waitingUserUpdates[0][1]);
      expect(waitingUserUpdates[0][2]).toEqual({
        internalRemark: '',
        linkedOrders: [expect.objectContaining({
          lastShipmentCheckStatus: 'waiting_user',
          lastShipmentCheckError: '淘宝页面需要人工处理：登录',
        })],
      });
    } finally {
      vi.useRealTimers();
    }
  });
});
