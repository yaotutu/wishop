import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SYNC_SETTINGS,
  getSyncClassification,
  syncModuleSettingSchema,
} from './sync';

describe('sync domain contract', () => {
  it('keeps module sync and cloud execution disabled until the user enables them', () => {
    expect(DEFAULT_SYNC_SETTINGS.modules.orders.syncEnabled).toBe(false);
    expect(DEFAULT_SYNC_SETTINGS.modules.orders.cloudExecutionEnabled).toBe(false);
  });

  it('classifies only user-created important records as syncable source data', () => {
    expect(getSyncClassification('orderAssociations')).toMatchObject({
      category: 'source',
      syncable: true,
    });
    expect(getSyncClassification('orders')).toMatchObject({
      category: 'cache',
      syncable: false,
    });
    expect(getSyncClassification('credentials')).toMatchObject({
      category: 'secret',
      syncable: true,
    });
  });

  it('validates module settings with zod', () => {
    expect(() => syncModuleSettingSchema.parse({
      mode: 'syncEnabled',
      syncEnabled: true,
      cloudExecutionEnabled: false,
    })).not.toThrow();
    expect(() => syncModuleSettingSchema.parse({
      mode: 'syncEnabled',
      syncEnabled: 'yes',
      cloudExecutionEnabled: false,
    })).toThrow();
  });
});
