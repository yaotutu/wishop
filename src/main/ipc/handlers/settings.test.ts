import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ScheduledJob } from '../../../shared/types';

const mocks = vi.hoisted(() => ({
  handle: vi.fn(),
  getAppSettings: vi.fn(),
  updateAppSettings: vi.fn(),
  reconcileScheduledJobDefinition: vi.fn(),
}));

vi.mock('electron', () => ({
  ipcMain: {
    handle: mocks.handle,
  },
}));

vi.mock('../../store', () => ({
  getAppSettings: mocks.getAppSettings,
  updateAppSettings: mocks.updateAppSettings,
}));

vi.mock('../../scheduler/scheduled-job-runner', () => ({
  reconcileScheduledJobDefinition: mocks.reconcileScheduledJobDefinition,
}));

const { registerSettingsHandlers } = await import('./settings');

function makeJob(): ScheduledJob {
  return {
    id: 'job-1',
    name: '采购发货状态检测',
    enabled: true,
    module: 'orders',
    jobType: 'orders.checkShipmentStatus',
    scope: 'global',
    cronExpression: '*/15 * * * *',
    payload: {},
    stats: { lastRunDate: '', todayRunCount: 0 },
    createdAt: 1,
    updatedAt: 1,
  };
}

describe('settings IPC handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAppSettings.mockReturnValue({ shipmentCheck: { enabled: true } });
    mocks.updateAppSettings.mockReturnValue({ shipmentCheck: { enabled: true, windowMinutes: 15 } });
    mocks.reconcileScheduledJobDefinition.mockReturnValue(makeJob());
  });

  it('asks the scheduler center to reconcile the shipment check job when settings change', async () => {
    registerSettingsHandlers();
    const updateHandler = mocks.handle.mock.calls.find(([channel]) => channel === 'settings:update')?.[1];

    expect(updateHandler).toBeTypeOf('function');

    const settings = await updateHandler({}, { shipmentCheck: { windowMinutes: 15 } });

    expect(settings).toEqual({ shipmentCheck: { enabled: true, windowMinutes: 15 } });
    expect(mocks.updateAppSettings).toHaveBeenCalledWith({ shipmentCheck: { windowMinutes: 15 } });
    expect(mocks.reconcileScheduledJobDefinition).toHaveBeenCalledWith('orders.checkShipmentStatus');
  });
});
