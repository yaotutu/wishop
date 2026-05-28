import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { test } from 'node:test';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('desktop exposes adapted non-taobao license APIs and settings UI entry', () => {
  const preload = read('src/preload/index.ts');
  const types = read('src/shared/types.ts');
  const settings = read('src/renderer/pages/settings/SettingsPage.tsx');

  assert.match(types, /export interface LicenseState/);
  assert.match(preload, /license:\s*{/);
  assert.match(preload, /license:get/);
  assert.match(settings, /授权状态/);
  assert.doesNotMatch(types, /\|\s*'shipping'/);
});

test('desktop has account import parser with duplicate appId handling', () => {
  const importPath = 'src/renderer/pages/store-management/import-accounts.ts';
  assert.ok(existsSync(new URL(`../${importPath}`, import.meta.url)));
  const source = read(importPath);
  assert.match(source, /parseAccountImportJson/);
  assert.match(source, /AppID 已存在/);
});

test('orders page has desktop product-source and manual association editing without taobao flows', () => {
  assert.ok(existsSync(new URL('../src/renderer/pages/orders/ProductSourceModal.tsx', import.meta.url)));
  assert.ok(existsSync(new URL('../src/renderer/pages/orders/OrderAssociationModal.tsx', import.meta.url)));
  const ordersPage = read('src/renderer/pages/orders/OrdersPage.tsx');
  const associationModal = read('src/renderer/pages/orders/OrderAssociationModal.tsx');

  assert.match(ordersPage, /ProductSourceModal/);
  assert.match(ordersPage, /OrderAssociationModal/);
  assert.match(associationModal, /manual/);
  assert.doesNotMatch(ordersPage + associationModal, /taobao|Tmall|tmall|purchaseLookup|taobaoRefund/);
});

test('violation scheduled job is wired to a real executor instead of skip placeholder', () => {
  const scheduler = read('src/main/scheduler/scheduled-jobs.ts');
  assert.match(scheduler, /violation\.scanProducts/);
  assert.match(scheduler, /batchScanViolationProducts/);
  assert.doesNotMatch(scheduler, /违规词扫描定时任务暂未接入/);
});
