import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';

const root = resolve(import.meta.dirname, '..');

function source(path) {
  return readFileSync(resolve(root, path), 'utf8');
}

test('shared types expose migrated non-Taobao order and scheduler contracts', () => {
  const types = source('src/shared/types.ts');

  for (const expected of [
    'ScheduledJob',
    'ScheduledJobView',
    'OrderScope',
    'LocalOrderListResult',
    'OrderRefreshResult',
    'OrderSyncState',
    'OrderAssociation',
    'ProductSourceItem',
  ]) {
    assert.match(types, new RegExp(`\\b${expected}\\b`));
  }

  assert.doesNotMatch(types, /\bTaobao(?:Refund|Workspace|Security|Purchase)/);
});

test('preload exposes migrated desktop APIs without Taobao work-page channels', () => {
  const preload = source('src/preload/index.ts');

  for (const expected of [
    'scheduledJobs',
    'activityLogs',
    'notifications',
    'settings',
    'productSources',
    'orderAssociations',
    'orderRealAddresses',
  ]) {
    assert.match(preload, new RegExp(`\\b${expected}\\b`));
  }

  for (const forbidden of [
    'purchaseLookup',
    'taobaoRefund',
    'taobaoWorkspace',
    'shipping:',
  ]) {
    assert.doesNotMatch(preload, new RegExp(forbidden));
  }
});

test('new scheduler excludes Taobao shipment-check job type', () => {
  const types = source('src/shared/types.ts');

  assert.doesNotMatch(types, /orders\.checkShipmentStatus/);
  assert.match(types, /orders\.syncRecent/);
  assert.match(types, /orders\.backfillHistory/);
});
