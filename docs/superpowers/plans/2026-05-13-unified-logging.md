# 统一 Console 日志规范 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 统一所有 `console.*` 调用为 `electron-log`，通过 `log.scope()` 强制 `[Module:accountId]` 标签格式，日志自动写入文件，修复静默错误吞没。

**Architecture:** 引入 `electron-log` 库，创建薄封装 `createLogger(module, accountId)` 基于 `log.scope()`。所有 modules 层函数末尾新增 `accountId` 参数。所有 `console.*` 调用替换为 `logger.*`。日志自动写入 `userData/logs/main.log`。

**Tech Stack:** TypeScript, Electron 28, electron-log 5.x

---

### Task 1: 安装 electron-log + 创建封装 + 初始化配置

**Files:**
- Create: `src/main/utils/logger.ts`
- Modify: `src/main/index.ts`

- [ ] **Step 1: 安装 electron-log**

Run: `npm install electron-log`

- [ ] **Step 2: 创建 logger.ts 封装**

```typescript
// src/main/utils/logger.ts
import log from 'electron-log/main';

export function createLogger(module: string, accountId: string) {
  return log.scope(`${module}:${accountId}`);
}

export { log };
```

- [ ] **Step 3: 在 main/index.ts 中初始化 electron-log**

在 `createWindow()` 之前添加：

```typescript
import { log } from './utils/logger';

// 初始化 electron-log
log.initialize();
log.transports.file.resolvePathFn = (vars) => {
  const path = require('path');
  return path.join(vars.userData, 'logs', 'main.log');
};
log.transports.file.maxSize = 5 * 1024 * 1024; // 5MB

// 自定义格式：[Module:accountId] message
log.transports.console.format = ({ data, message }) => {
  const prefix = message.scope ? `[${message.scope}] ` : '';
  return [`${prefix}`, ...data];
};

log.transports.file.format = ({ data, level, message }) => {
  const ts = message.date.toISOString().slice(0, 19);
  const scope = message.scope ? `[${message.scope}] ` : '';
  const text = data.map(d => typeof d === 'string' ? d : JSON.stringify(d)).join(' ');
  return `[${ts}] [${level}] ${scope}${text}`;
};
```

注意：`import { log } from './utils/logger'` 而不是直接 `from 'electron-log/main'`，确保只有一个入口。

- [ ] **Step 4: 验证编译通过**

Run: `npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 5: Commit**

```
feat: install electron-log and create logger wrapper
```

---

### Task 2: 改造 modules 层（新增 accountId 参数 + 替换 console）

**Files:**
- Modify: `src/main/modules/fetch-draft-products.ts`
- Modify: `src/main/modules/delete-failed-products.ts`
- Modify: `src/main/modules/list-unreviewed-products.ts`
- Modify: `src/main/modules/violation-detect.ts`
- Modify: `src/main/modules/task-cycle.ts`

- [ ] **Step 1: 改造 fetch-draft-products.ts**

完整替换后文件：

```typescript
import { WxShopClient, DraftProduct } from '../wxshop/client';
import { createLogger } from '../utils/logger';

export async function* streamDraftProducts(api: WxShopClient, signal?: AbortSignal, accountId: string = ''): AsyncGenerator<DraftProduct> {
  const logger = createLogger('StreamDrafts', accountId);
  let nextKey = '';
  let hasMore = true;

  while (hasMore) {
    if (signal?.aborted) return;
    const listResult = await api.getDraftProducts(30, nextKey);

    for (const productId of listResult.productIds) {
      if (signal?.aborted) return;
      try {
        const detail = await api.getProductDetail(productId);
        yield detail;
      } catch (error) {
        logger.error(`获取商品 ${productId} 详情失败:`, error);
      }
    }

    nextKey = listResult.nextKey;
    hasMore = listResult.hasMore && !!nextKey;
  }
}
```

- [ ] **Step 2: 改造 delete-failed-products.ts**

完整替换后文件：

```typescript
import { WxShopClient, DraftProduct } from '../wxshop/client';
import { AddLogFn } from '../store';
import { createLogger } from '../utils/logger';

const DELETE_INTERVAL_MS = 1000;
const lastDeleteTimeMap = new Map<string, number>();

export async function deleteOne(
  api: WxShopClient,
  addLog: AddLogFn,
  product: DraftProduct,
  runId: string,
  accountId: string = '',
): Promise<'success' | 'failed' | 'stopped'> {
  const logger = createLogger('DeleteFailed', accountId);
  try {
    const cacheKey = api.config.appId;
    const lastDeleteTime = lastDeleteTimeMap.get(cacheKey) || 0;
    const now = Date.now();
    const elapsed = now - lastDeleteTime;
    if (elapsed < DELETE_INTERVAL_MS) {
      await new Promise(resolve => setTimeout(resolve, DELETE_INTERVAL_MS - elapsed));
    }

    const res = await api.deleteProduct(product.productId);
    lastDeleteTimeMap.set(cacheKey, Date.now());

    if (res.errcode === 0) {
      addLog({ runId, productId: product.productId, productTitle: product.title, action: 'delete', status: 'success' });
      logger.info(`已删除: ${product.title}`);
      return 'success';
    }

    logger.warn(`errcode=${res.errcode}, 完整报文: ${JSON.stringify(res)}`);

    if (res.errcode === 10020208 || res.errcode === 10020247) {
      addLog({ runId, productId: product.productId, productTitle: product.title, action: 'delete', status: 'failed', errorCode: res.errcode, errorMsg: res.errmsg });
      logger.warn(`全局限制(${res.errcode})，停止`);
      return 'stopped';
    }

    addLog({ runId, productId: product.productId, productTitle: product.title, action: 'delete', status: 'failed', errorCode: res.errcode, errorMsg: res.errmsg });
    return 'failed';
  } catch (error: any) {
    addLog({ runId, productId: product.productId, productTitle: product.title, action: 'delete', status: 'failed', errorMsg: error.message });
    logger.error(`异常: ${product.title}`, error);
    return 'failed';
  }
}

export async function batchDelete(
  api: WxShopClient,
  addLog: AddLogFn,
  products: Array<{ productId: string; title: string }>,
  runId: string,
  accountId: string = '',
): Promise<{ deleted: number; errors: number; stopped: boolean }> {
  let deleted = 0;
  let errors = 0;
  let stopped = false;

  for (const product of products) {
    const draft: DraftProduct = {
      productId: product.productId,
      title: product.title,
      headImgs: [],
      status: 0,
      editStatus: 0,
    };
    const res = await deleteOne(api, addLog, draft, runId, accountId);
    if (res === 'success') {
      deleted++;
    } else if (res === 'stopped') {
      stopped = true;
      break;
    } else {
      errors++;
    }
  }

  return { deleted, errors, stopped };
}
```

- [ ] **Step 3: 改造 list-unreviewed-products.ts**

完整替换后文件：

```typescript
import { WxShopClient, DraftProduct } from '../wxshop/client';
import { AddLogFn } from '../store';
import { createLogger, Logger } from '../utils/logger';

export type ListOneResult = 'success' | 'failed' | 'skipped' | 'stopped';

const SUBMIT_INTERVAL_MS = 3000;
const lastSubmitTimeMap = new Map<string, number>();

// 账号级错误 — 影响所有商品，立即停止任务
const STOP_CODES = new Set([
  1002002,
  10020066,
  10020111,
  10020208,
  10020246,
  10020247,
]);

// 商品级错误 — 该商品本身有问题，跳过继续下一个
const SKIP_CODES = new Set([
  10020110,  // 商品信息检查不通过
  10020067,
  10020049,
  10020052,
  10020053,
  10020008,
]);

async function waitInterval(cacheKey: string, signal?: AbortSignal, logger?: any): Promise<void> {
  const lastSubmitTime = lastSubmitTimeMap.get(cacheKey) || 0;
  const now = Date.now();
  const elapsed = now - lastSubmitTime;
  if (elapsed < SUBMIT_INTERVAL_MS) {
    const waitMs = SUBMIT_INTERVAL_MS - elapsed;
    logger?.info(`等待间隔 ${waitMs}ms...`);
    if (signal) {
      await Promise.race([
        new Promise(resolve => setTimeout(resolve, waitMs)),
        new Promise(resolve => { signal.addEventListener('abort', resolve, { once: true }); }),
      ]);
    } else {
      await new Promise(resolve => setTimeout(resolve, waitMs));
    }
  }
}

export async function listOne(
  api: WxShopClient,
  addLog: AddLogFn,
  product: DraftProduct,
  runId: string,
  signal?: AbortSignal,
  accountId: string = '',
): Promise<ListOneResult> {
  const logger = createLogger('ListUnreviewed', accountId);
  try {
    const latest = await api.getProductDetail(product.productId);
    if (latest.editStatus !== 72) {
      logger.info(`跳过 (状态已变为 ${latest.editStatus}): ${product.title}`);
      return 'skipped';
    }

    await waitInterval(api.config.appId, signal, logger);
    const res = await api.listProduct(product.productId);
    lastSubmitTimeMap.set(api.config.appId, Date.now());

    if (res.errcode === 0) {
      addLog({ runId, productId: product.productId, productTitle: product.title, action: 'list', status: 'success' });
      logger.info(`提交成功: ${product.title}`);
      return 'success';
    }

    logger.warn(`errcode=${res.errcode}, 完整报文: ${JSON.stringify(res)}`);

    if (STOP_CODES.has(res.errcode)) {
      addLog({ runId, productId: product.productId, productTitle: product.title, action: 'list', status: 'failed', errorCode: res.errcode, errorMsg: res.errmsg });
      logger.warn(`账号级错误(${res.errcode})，停止任务`);
      return 'stopped';
    }

    if (SKIP_CODES.has(res.errcode)) {
      addLog({ runId, productId: product.productId, productTitle: product.title, action: 'list', status: 'failed', errorCode: res.errcode, errorMsg: res.errmsg });
      logger.info(`商品级错误(${res.errcode})，跳过: ${product.title}`);
      return 'skipped';
    }

    // 未知错误 — 可能是网络/系统问题，计入连续失败
    addLog({ runId, productId: product.productId, productTitle: product.title, action: 'list', status: 'failed', errorCode: res.errcode, errorMsg: res.errmsg });
    return 'failed';
  } catch (error: any) {
    addLog({ runId, productId: product.productId, productTitle: product.title, action: 'list', status: 'failed', errorMsg: error.message });
    logger.error(`异常: ${product.title}`, error);
    return 'failed';
  }
}
```

注意：`waitInterval` 的 `logger` 参数类型用 `any` 避免 electron-log 类型导入问题。

- [ ] **Step 4: 改造 violation-detect.ts**

完整替换后文件：

```typescript
import { WxShopClient } from '../wxshop/client';
import type { AddLogFn, ViolationMatch, ViolationScanResult } from '../../shared/types';
import { streamDraftProducts } from './fetch-draft-products';
import { batchDelete } from './delete-failed-products';
import { createLogger } from '../utils/logger';

export function findMatches(title: string, words: string[]): string[] {
  const lower = title.toLowerCase();
  return words.filter(w => w && lower.includes(w.toLowerCase()));
}

export async function* scanOneByOne(
  api: WxShopClient,
  addLog: AddLogFn,
  words: string[],
  runId: string,
  signal?: AbortSignal,
  accountId: string = '',
): AsyncGenerator<ViolationMatch & { scanned: number }> {
  const logger = createLogger('ViolationScan', accountId);
  logger.info(`开始违规词检测，词库共 ${words.length} 个词`);
  addLog({ runId, productId: '', productTitle: `开始违规词检测，词库共 ${words.length} 个词`, action: 'check', status: 'success' });
  let scanned = 0;
  for await (const product of streamDraftProducts(api, signal, accountId)) {
    if (signal?.aborted) {
      logger.info(`用户手动停止，已扫描 ${scanned} 条`);
      return;
    }
    scanned++;
    if (product.editStatus !== 72) continue;
    logger.info(`#${scanned} id=${product.productId} editStatus=${product.editStatus} ${product.title}`);
    const matched = findMatches(product.title, words);
    if (matched.length > 0) {
      logger.info(`↑ 匹配违规词: [${matched.join(', ')}]`);
      addLog({
        runId,
        productId: product.productId,
        productTitle: product.title,
        action: 'check',
        status: 'failed',
        errorMsg: `匹配到违规词: ${matched.join(', ')}`,
      });
      yield { productId: product.productId, title: product.title, matchedWords: matched, scanned };
    }
    if (scanned % 30 === 0) {
      logger.info(`进度: 已扫描 ${scanned} 条`);
      addLog({ runId, productId: '', productTitle: `已扫描 ${scanned} 条商品`, action: 'check', status: 'success' });
    }
  }
  logger.info(`完成: 共扫描 ${scanned} 条`);
  addLog({ runId, productId: '', productTitle: `扫描完成: 共扫描 ${scanned} 条`, action: 'check', status: 'success' });
}

export async function batchScan(
  api: WxShopClient,
  addLog: AddLogFn,
  words: string[],
  runId: string,
  signal?: AbortSignal,
  limit?: number,
  accountId: string = '',
): Promise<ViolationScanResult> {
  const result: ViolationScanResult = { scanned: 0, violations: [], errors: 0, stopped: false };
  let lastScanned = 0;

  for await (const match of scanOneByOne(api, addLog, words, runId, signal, accountId)) {
    result.violations.push({ productId: match.productId, title: match.title, matchedWords: match.matchedWords });
    lastScanned = match.scanned;
    if (limit && lastScanned >= limit) {
      addLog({ runId, productId: '', productTitle: `已达到扫描上限 ${limit} 条，停止扫描`, action: 'check', status: 'success' });
      break;
    }
  }

  result.scanned = lastScanned;
  if (signal?.aborted) {
    result.stopped = true;
    result.reason = '用户手动停止';
  }

  addLog({ runId, productId: '', productTitle: `扫描完成: 共扫描 ${result.scanned} 条，发现 ${result.violations.length} 条违规`, action: 'check', status: result.violations.length > 0 ? 'failed' : 'success' });
  return result;
}

export { batchDelete as batchDeleteViolations };
```

- [ ] **Step 5: 改造 task-cycle.ts**

完整替换后文件：

```typescript
import { WxShopClient } from '../wxshop/client';
import type { DraftProduct, AddLogFn, TaskConfig, TaskCycleResult } from '../../shared/types';

export type { TaskConfig, TaskCycleResult };
import { streamDraftProducts } from './fetch-draft-products';
import { deleteOne } from './delete-failed-products';
import { listOne } from './list-unreviewed-products';
import { createLogger } from '../utils/logger';

const CONSECUTIVE_THRESHOLD = 3;

export async function runTaskCycle(
  api: WxShopClient,
  addLog: AddLogFn,
  taskConfig: TaskConfig,
  runId: string,
  signal?: AbortSignal,
  accountId: string = '',
): Promise<TaskCycleResult> {
  const logger = createLogger('TaskCycle', accountId);
  logger.info(`开始 (runId=${runId}): 删除失败=${taskConfig.deleteFailed}, 提交未审核=${taskConfig.listUnreviewed}(${taskConfig.listUnreviewedQuantity})`);

  const result: TaskCycleResult = { scanned: 0, deleted: 0, listed: 0, errors: 0, skipped: 0, stopped: false, pendingDelete: [] };
  const pendingDelete: DraftProduct[] = [];
  let listCount = 0;
  let consecutiveMiss = 0;
  let consecutiveFails = 0;
  let consecutiveSkips = 0;
  let lastErrorCode: number | undefined;
  let lastErrorMsg: string | undefined;

  const listDone = () => !taskConfig.listUnreviewed || listCount >= taskConfig.listUnreviewedQuantity;
  const needConsecutiveCheck = taskConfig.deleteFailed && !taskConfig.listUnreviewed;

  const trackLog: AddLogFn = (log) => {
    if (log.status === 'failed') {
      lastErrorCode = log.errorCode;
      lastErrorMsg = log.errorMsg;
    }
    addLog(log);
  };

  for await (const product of streamDraftProducts(api, signal, accountId)) {
    if (signal?.aborted) {
      result.stopped = true;
      result.reason = '用户手动停止';
      logger.info(`用户手动停止，已扫描 ${result.scanned} 条`);
      break;
    }

    result.scanned++;
    logger.info(`扫描 #${result.scanned}: ${product.title} (edit_status=${product.editStatus})`);

    if (taskConfig.listUnreviewed && listDone()) break;

    if (product.editStatus === 3 && taskConfig.deleteFailed) {
      consecutiveMiss = 0;
      if (taskConfig.deleteFailedConfirm) {
        consecutiveFails = 0;
        consecutiveSkips = 0;
        pendingDelete.push(product);
        logger.info(`标记待删除: ${product.title}`);
      } else {
        const res = await deleteOne(api, trackLog, product, runId, accountId);
        if (res === 'success') {
          consecutiveFails = 0;
          consecutiveSkips = 0;
          result.deleted++;
        } else if (res === 'stopped') {
          result.stopped = true;
          result.reason = '删除操作被限制';
          break;
        } else {
          result.errors++;
          consecutiveFails++;
          consecutiveSkips = 0;
          if (consecutiveFails >= CONSECUTIVE_THRESHOLD) {
            result.stopped = true;
            result.reason = `连续${consecutiveFails}次删除失败，自动停止 (errcode=${lastErrorCode}, ${lastErrorMsg})`;
            logger.warn(result.reason);
            break;
          }
        }
      }
      continue;
    }

    if (product.editStatus === 72 && taskConfig.listUnreviewed && !listDone()) {
      consecutiveMiss = 0;
      const res = await listOne(api, trackLog, product, runId, signal, accountId);
      if (res === 'success') {
        consecutiveFails = 0;
        consecutiveSkips = 0;
        listCount++;
        result.listed++;
      } else if (res === 'skipped') {
        consecutiveFails = 0;
        consecutiveSkips++;
        result.skipped++;
        if (consecutiveSkips >= CONSECUTIVE_THRESHOLD) {
          result.stopped = true;
          result.reason = `连续${consecutiveSkips}次跳过，可能存在账号级问题 (errcode=${lastErrorCode}, ${lastErrorMsg})`;
          logger.warn(result.reason);
          break;
        }
      } else if (res === 'stopped') {
        result.stopped = true;
        result.reason = '提审次数超限';
        break;
      } else {
        result.errors++;
        consecutiveFails++;
        consecutiveSkips = 0;
        if (consecutiveFails >= CONSECUTIVE_THRESHOLD) {
          result.stopped = true;
          result.reason = `连续${consecutiveFails}次上架失败，自动停止 (errcode=${lastErrorCode}, ${lastErrorMsg})`;
          logger.warn(result.reason);
          break;
        }
      }
      continue;
    }

    logger.info(`跳过: edit_status=${product.editStatus}, 不匹配当前任务`);
    if (needConsecutiveCheck) {
      consecutiveMiss++;
      if (consecutiveMiss >= 5) {
        logger.info(`连续 ${consecutiveMiss} 条未匹配，停止扫描`);
        break;
      }
    }
  }

  result.pendingDelete = pendingDelete;
  logger.info(`完成: 扫描=${result.scanned}, 删除=${result.deleted}, 提交=${result.listed}, 待确认删除=${pendingDelete.length}, 停止=${result.stopped}`);
  return result;
}
```

- [ ] **Step 6: 验证编译通过**

Run: `npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 7: Commit**

```
refactor: replace console.* with electron-log in modules layer
```

---

### Task 3: 改造 handlers 层 + scheduler + store + updater

**Files:**
- Modify: `src/main/ipc/handlers/task.ts`
- Modify: `src/main/ipc/handlers/drafts.ts`
- Modify: `src/main/ipc/handlers/violation.ts`
- Modify: `src/main/ipc/handlers/orders.ts`
- Modify: `src/main/scheduler/listing-scheduler.ts`
- Modify: `src/main/store/index.ts`
- Modify: `src/main/updater.ts`

- [ ] **Step 1: 改造 task.ts**

```typescript
import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { createScopedAddLog, getTaskConfig, setTaskConfig } from '../../store';
import type { TaskConfig, DraftProduct, TaskCycleResult } from '../../../shared/types';
import { getClient } from '../../wxshop/client-registry';
import { runTaskCycle } from '../../modules/task-cycle';
import { batchDelete } from '../../modules/delete-failed-products';
import { withLogForwarding } from '../utils/log-forwarding';
import { SessionManager } from '../utils/session-manager';
import { createLogger } from '../../utils/logger';

export function registerTaskHandlers(context: { taskSessions: SessionManager<void> }): void {
  ipcMain.handle('taskConfig:get', (_, accountId: string): TaskConfig => {
    return getTaskConfig(accountId);
  });

  ipcMain.handle('taskConfig:set', (_, accountId: string, config: TaskConfig): void => {
    setTaskConfig(accountId, config);
  });

  ipcMain.handle('task:run', async (event: IpcMainInvokeEvent, accountId: string, taskConfig: TaskConfig): Promise<TaskCycleResult> => {
    const runId = Date.now().toString();
    const scopedAddLog = createScopedAddLog(accountId);
    const logger = createLogger('TaskRun', accountId);

    if (taskConfig.listUnreviewed) {
      try {
        const api = getClient(accountId);
        const quota = await api.getAuditQuota();
        logger.info(`配额检查: 剩余 ${quota.quota} / 总共 ${quota.total}`);
        if (quota.quota > 0) {
          scopedAddLog({ runId, productId: '', productTitle: `今日提审配额: 剩余${quota.quota}/${quota.total}`, action: 'check', status: 'success' });
        } else {
          scopedAddLog({ runId, productId: '', productTitle: `今日提审配额已用完 (${quota.quota}/${quota.total})，请明天再试`, action: 'check', status: 'failed' });
          logger.warn(`配额为0，跳过执行`);
          return { scanned: 0, deleted: 0, listed: 0, errors: 0, skipped: 0, stopped: true, reason: `提审配额已用完 (剩余${quota.quota}/${quota.total})`, pendingDelete: [] };
        }
      } catch (error: any) {
        scopedAddLog({ runId, productId: '', productTitle: '', action: 'check', status: 'failed', errorMsg: `配额检查失败: ${error.message}` });
        logger.error('配额检查失败:', error);
        return { scanned: 0, deleted: 0, listed: 0, errors: 0, skipped: 0, stopped: true, reason: `配额检查失败: ${error.message}`, pendingDelete: [] };
      }
    }

    return withLogForwarding(event, accountId, `log:added:${accountId}`, async () => {
      const signal = context.taskSessions.start(accountId, undefined);
      try {
        const api = getClient(accountId);
        const taskResult = await runTaskCycle(api, scopedAddLog, taskConfig, runId, signal, accountId);
        return { ...taskResult, pendingDelete: taskResult.pendingDelete };
      } finally {
        context.taskSessions.complete(accountId);
      }
    });
  });

  ipcMain.handle('task:stop', (_, accountId: string): void => {
    context.taskSessions.stop(accountId);
    const logger = createLogger('TaskStop', accountId);
    logger.info('已发送停止信号');
  });

  ipcMain.handle('task:batchDelete', async (event: IpcMainInvokeEvent, accountId: string, products: DraftProduct[]): Promise<{ deleted: number; errors: number; stopped: boolean }> => {
    const runId = Date.now().toString();
    const scopedAddLog = createScopedAddLog(accountId);
    const api = getClient(accountId);

    return withLogForwarding(event, accountId, `log:added:${accountId}`, () =>
      batchDelete(api, scopedAddLog, products, runId, accountId),
    );
  });
}
```

- [ ] **Step 2: 改造 drafts.ts**

```typescript
import { ipcMain } from 'electron';
import { createScopedAddLog } from '../../store';
import type { DraftProduct } from '../../../shared/types';
import { getClient } from '../../wxshop/client-registry';
import { createLogger } from '../../utils/logger';

interface PaginationState {
  nextKey: string;
  hasMore: boolean;
}

export function registerDraftHandlers(context: { draftPaginationMap: Map<string, PaginationState> }): void {
  ipcMain.handle('drafts:fetch', async (_, accountId: string, reset?: boolean): Promise<{ products: DraftProduct[]; hasMore: boolean }> => {
    const logger = createLogger('Drafts', accountId);
    let pagination = context.draftPaginationMap.get(accountId);
    if (!pagination || reset) {
      pagination = { nextKey: '', hasMore: true };
      context.draftPaginationMap.set(accountId, pagination);
    }

    if (!pagination.hasMore) {
      return { products: [], hasMore: false };
    }

    const api = getClient(accountId);
    const need = 10;
    const products: DraftProduct[] = [];
    let nextKey = pagination.nextKey;

    while (products.length < need) {
      const result = await api.getDraftProducts(30, nextKey);

      for (const productId of result.productIds) {
        if (products.length >= need) break;
        try {
          const detail = await api.getProductDetail(productId);
          if (detail.editStatus === 72) {
            products.push(detail);
          }
        } catch (error) {
          logger.error(`获取商品 ${productId} 详情失败:`, error);
        }
      }

      nextKey = result.nextKey;
      if (!result.hasMore || !nextKey) {
        pagination.hasMore = false;
        break;
      }
    }

    pagination.nextKey = nextKey;
    return { products, hasMore: pagination.hasMore };
  });

  ipcMain.handle('drafts:list', async (_, accountId: string, productId: string): Promise<{ success: boolean; error?: string }> => {
    const api = getClient(accountId);
    const scopedAddLog = createScopedAddLog(accountId);
    const logger = createLogger('Drafts', accountId);
    try {
      const result = await api.listProduct(productId);
      if (result.errcode === 0) {
        scopedAddLog({ runId: '', productId, productTitle: '', action: 'list', status: 'success' });
        return { success: true };
      } else {
        scopedAddLog({ runId: '', productId, productTitle: '', action: 'list', status: 'failed', errorCode: result.errcode, errorMsg: result.errmsg });
        return { success: false, error: result.errmsg };
      }
    } catch (error: any) {
      scopedAddLog({ runId: '', productId, productTitle: '', action: 'list', status: 'failed', errorMsg: error.message });
      logger.error(`上架商品 ${productId} 失败:`, error);
      return { success: false, error: error.message };
    }
  });
}
```

- [ ] **Step 3: 改造 violation.ts**

```typescript
import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { createScopedAddLog, getViolationWords, setViolationWords, getAccount } from '../../store';
import type { ViolationMatch, ViolationScanResult } from '../../../shared/types';
import { getClient } from '../../wxshop/client-registry';
import { batchScan, scanOneByOne, batchDeleteViolations } from '../../modules/violation-detect';
import { createLogForwarder, withLogForwarding, LogForwarder } from '../utils/log-forwarding';
import { SessionManager } from '../utils/session-manager';
import { createLogger } from '../../utils/logger';

interface ScanSessionState {
  generator: AsyncGenerator<ViolationMatch & { scanned: number }> | null;
  current: (ViolationMatch & { scanned: number }) | null;
  done: boolean;
  logForwarder: LogForwarder;
}

export function registerViolationHandlers(context: {
  scanSessions: SessionManager<ScanSessionState>;
}): void {

  ipcMain.handle('violation:getWords', (_, accountId: string): string[] => {
    return getViolationWords(accountId);
  });

  ipcMain.handle('violation:setWords', (_, accountId: string, words: string[]): void => {
    setViolationWords(accountId, words);
  });

  ipcMain.handle('violation:batchScan', async (event: IpcMainInvokeEvent, accountId: string, limit?: number): Promise<ViolationScanResult> => {
    const runId = Date.now().toString();
    const scopedAddLog = createScopedAddLog(accountId);
    const api = getClient(accountId);
    const words = getViolationWords(accountId);
    const logger = createLogger('Violation', accountId);

    const account = getAccount(accountId);
    logger.info(`批量扫描开始 店铺=${account?.name || '未知'} appId=${api.config.appId} 词库=${words.length}个 上限=${limit || '全部'}`);

    if (words.length === 0) {
      logger.info('词库为空，跳过');
      return { scanned: 0, violations: [], errors: 0, stopped: false, reason: '词库为空' };
    }

    const logForwarder = createLogForwarder(event, accountId, `violation:log:${accountId}`);
    const signal = context.scanSessions.start(accountId, { generator: null, current: null, done: false, logForwarder });
    logForwarder.start();

    try {
      return await batchScan(api, scopedAddLog, words, runId, signal, limit, accountId);
    } finally {
      context.scanSessions.complete(accountId);
      logForwarder.stop();
    }
  });

  ipcMain.handle('violation:scanStep', async (event: IpcMainInvokeEvent, accountId: string, action: 'next' | 'skip' | 'delete'): Promise<any> => {
    const logger = createLogger('Violation', accountId);
    let session = context.scanSessions.get(accountId);

    if (!session || session.state.done) {
      const words = getViolationWords(accountId);
      if (words.length === 0) {
        return { type: 'done', reason: '词库为空' };
      }
      const account = getAccount(accountId);
      const api = getClient(accountId);
      logger.info(`逐个扫描开始 店铺=${account?.name || '未知'} appId=${api.config.appId} 词库=${words.length}个`);
      const scopedAddLog = createScopedAddLog(accountId);
      const runId = Date.now().toString();
      const logForwarder = createLogForwarder(event, accountId, `violation:log:${accountId}`);
      logForwarder.start();

      const signal = context.scanSessions.start(accountId, { generator: null, current: null, done: false, logForwarder });
      const generator = scanOneByOne(api, scopedAddLog, words, runId, signal, accountId);
      session = context.scanSessions.get(accountId)!;
      session.state.generator = generator;
    }

    if (action === 'delete' && session.state.current) {
      const scopedAddLog = createScopedAddLog(accountId);
      const runId = Date.now().toString();
      const api = getClient(accountId);

      try {
        const result = await batchDeleteViolations(api, scopedAddLog, [session.state.current], runId, accountId);
        if (result.stopped) {
          session.state.done = true;
          session.state.logForwarder.stop();
          context.scanSessions.stop(accountId);
          return { type: 'stopped', reason: '删除触发全局限制' };
        }
      } catch (error) {
        logger.error('删除违规商品失败:', error);
      }
    }

    const next = await session.state.generator!.next();
    if (next.done) {
      session.state.done = true;
      session.state.logForwarder.stop();
      context.scanSessions.complete(accountId);
      return { type: 'done', scanned: session.state.current?.scanned || 0 };
    }

    session.state.current = next.value;
    return { type: 'violation', ...next.value };
  });

  ipcMain.handle('violation:batchDelete', async (event: IpcMainInvokeEvent, accountId: string, violations: ViolationMatch[]): Promise<{ deleted: number; errors: number; stopped: boolean }> => {
    const runId = Date.now().toString();
    const scopedAddLog = createScopedAddLog(accountId);
    const api = getClient(accountId);

    return withLogForwarding(event, accountId, `violation:log:${accountId}`, async () => {
      return await batchDeleteViolations(api, scopedAddLog, violations, runId, accountId);
    });
  });

  ipcMain.handle('violation:stop', (_, accountId: string): void => {
    const session = context.scanSessions.get(accountId);
    if (session) {
      session.state.logForwarder.stop();
      context.scanSessions.stop(accountId);
    }
  });
}
```

- [ ] **Step 4: 改造 orders.ts**

在文件顶部添加 `import { createLogger } from '../../utils/logger';`

每个 handler 内创建 logger：
```typescript
const logger = createLogger('Orders', accountId);
// 替换 3 处 console.error 为:
logger.error(`获取订单 ${orderId} 详情失败:`, error);
```

- [ ] **Step 5: 改造 listing-scheduler.ts**

```typescript
import * as cron from 'node-cron';
import { getAccounts, getSchedulers, updateScheduler, createScopedAddLog } from '../store';
import type { ScheduledTask } from '../../shared/types';
import { getClient } from '../wxshop/client-registry';
import { runTaskCycle } from '../modules/task-cycle';
import { createLogger } from '../utils/logger';

const scheduledTasks = new Map<string, cron.ScheduledTask>();

async function executeTask(accountId: string, taskId: string): Promise<void> {
  const logger = createLogger('Scheduler', accountId);
  const schedulers = getSchedulers(accountId);
  const task = schedulers.find(t => t.id === taskId);
  if (!task) return;

  const today = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
  let count = task.todayListedCount;
  if (task.lastRunDate !== today) {
    count = 0;
    updateScheduler(accountId, taskId, { lastRunDate: today, todayListedCount: 0 });
  }

  if (task.dailyLimit > 0 && count >= task.dailyLimit) {
    logger.info(`今日上架次数已达上限，停止执行 (${taskId})`);
    return;
  }

  try {
    const api = getClient(accountId);
    const scopedAddLog = createScopedAddLog(accountId);
    const quota = await api.getAuditQuota();

    if (quota.quota <= 0) {
      logger.info(`配额已用完，停止执行 (${taskId})`);
      return;
    }

    const result = await runTaskCycle(api, scopedAddLog, task.taskConfig, `cron-${taskId}-${Date.now()}`, undefined, accountId);

    const newCount = count + result.listed;
    updateScheduler(accountId, taskId, { todayListedCount: newCount });
    logger.info(`执行完毕(${taskId}): 提交=${result.listed}, 删除=${result.deleted}`);
  } catch (error) {
    logger.error(`执行失败(${taskId}):`, error);
  }
}

export function startTask(accountId: string, task: ScheduledTask): void {
  const logger = createLogger('Scheduler', accountId);
  const key = `${accountId}:${task.id}`;

  if (scheduledTasks.has(key)) {
    scheduledTasks.get(key)!.stop();
    scheduledTasks.delete(key);
  }

  if (!task.enabled) return;

  if (!cron.validate(task.cronExpression)) {
    logger.error(`无效的 cron 表达式(${task.id}): ${task.cronExpression}`);
    return;
  }

  const cronTask = cron.schedule(task.cronExpression, () => executeTask(accountId, task.id));
  scheduledTasks.set(key, cronTask);
  logger.info(`已启动 "${task.name}"(${task.id}), cron: ${task.cronExpression}`);
}

export function stopTask(accountId: string, taskId: string): void {
  const logger = createLogger('Scheduler', accountId);
  const key = `${accountId}:${taskId}`;
  const cronTask = scheduledTasks.get(key);
  if (cronTask) {
    cronTask.stop();
    scheduledTasks.delete(key);
    logger.info(`已停止(${taskId})`);
  }
}

export function startAllTasks(): void {
  const accounts = getAccounts();
  for (const account of accounts) {
    for (const task of account.schedulers) {
      if (task.enabled) {
        startTask(account.id, task);
      }
    }
  }
}

export function stopAllTasks(): void {
  for (const [key, cronTask] of scheduledTasks) {
    cronTask.stop();
    scheduledTasks.delete(key);
  }
}
```

- [ ] **Step 6: 改造 store/index.ts**

在 line 107 附近，替换：
```typescript
// 旧: console.log('[Store] 已迁移单账号数据到多账号格式');
// 新:
import { createLogger } from '../utils/logger';
const logger = createLogger('Store', 'system');
logger.info('已迁移单账号数据到多账号格式');
```

- [ ] **Step 7: 改造 updater.ts**

```typescript
import { autoUpdater } from 'electron-updater';
import { BrowserWindow } from 'electron';
import { createLogger } from './utils/logger';

export function initUpdater(win: BrowserWindow): void {
  const logger = createLogger('Updater', 'system');
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', (info) => {
    logger.info(`发现新版本: ${info.version}`);
    if (!win.isDestroyed()) {
      win.webContents.send('update:available', { version: info.version });
    }
  });

  autoUpdater.on('download-progress', (progress) => {
    if (!win.isDestroyed()) {
      win.webContents.send('update:progress', { percent: Math.round(progress.percent) });
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    logger.info(`新版本已下载: ${info.version}`);
    if (!win.isDestroyed()) {
      win.webContents.send('update:downloaded', { version: info.version });
    }
  });

  autoUpdater.on('error', (error) => {
    logger.error('自动更新错误:', error);
  });

  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((error) => {
      logger.error('检查更新失败:', error);
    });
  }, 3000);
}

export function quitAndInstall(): void {
  autoUpdater.quitAndInstall();
}
```

- [ ] **Step 8: 验证编译通过**

Run: `npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 9: Commit**

```
refactor: replace all console.* with electron-log across handlers, scheduler, store, updater
```

---

### Task 4: 最终验证

- [ ] **Step 1: 全量编译**

Run: `npm run build`
Expected: 编译通过

- [ ] **Step 2: 搜索残留的裸 console 调用**

Run: `grep -rn "console\.\(log\|warn\|error\)" src/main/ --include="*.ts" | grep -v "node_modules" | grep -v "logger.ts"`
Expected: 0 结果（所有 console 调用都已通过 electron-log 封装）

- [ ] **Step 3: Commit（如有修正）**

如有编译或残留问题，修正后提交。
