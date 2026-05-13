# 统一 Console 日志规范

## Context

项目有两套并行日志系统：structured `addLog`（持久化到 UI）和 `console.*`（终端调试）。console 输出存在标签格式混乱、accountId 缺失、错误对象格式不统一、部分错误被静默吞没等问题。本次设计仅聚焦统一 console 输出，不改动 UI 日志展示。

## 方案：electron-log + createLogger 封装

引入 `electron-log` 5.x，基于其 `log.scope()` 创建薄封装。

新建 `src/main/utils/logger.ts`：

```typescript
import log from 'electron-log/main';

export function createLogger(module: string, accountId: string) {
  return log.scope(`${module}:${accountId}`);
}

export { log };
```

在 `main/index.ts` 中初始化：

```typescript
import { log } from './utils/logger';

log.initialize();
log.transports.file.resolvePathFn = (vars) => path.join(vars.userData, 'logs', 'main.log');
log.transports.file.maxSize = 5 * 1024 * 1024;

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

使用方式：

```typescript
const logger = createLogger('TaskCycle', accountId);
logger.info(`开始 (runId=${runId})`);
logger.warn(`连续 ${count} 次删除失败`);
logger.error(`异常: ${product.title}`, error);
```

收益：
- 统一 `[Module:accountId]` 标签格式
- 日志自动写入文件（`userData/logs/main.log`，5MB 自动轮转）
- 支持日志级别过滤
- error 自动保留完整堆栈

## 模块标签命名

| 标签名 | 文件 |
|---|---|
| `Store` | `store/index.ts` |
| `TaskRun` | `ipc/handlers/task.ts` |
| `TaskStop` | `ipc/handlers/task.ts` |
| `Drafts` | `ipc/handlers/drafts.ts` |
| `Violation` | `ipc/handlers/violation.ts` |
| `Scheduler` | `scheduler/listing-scheduler.ts` |
| `TaskCycle` | `modules/task-cycle.ts` |
| `DeleteFailed` | `modules/delete-failed-products.ts` |
| `ListUnreviewed` | `modules/list-unreviewed-products.ts` |
| `ViolationScan` | `modules/violation-detect.ts` |
| `StreamDrafts` | `modules/fetch-draft-products.ts` |
| `Updater` | `updater.ts` |

无 accountId 上下文的模块（Store、Updater）使用 `'system'` 作为 accountId。

## accountId 传入方式

modules 层函数末尾新增 `accountId: string` 参数：

| 函数 | 新增参数位置 |
|---|---|
| `runTaskCycle(api, addLog, taskConfig, runId, signal, accountId)` | 末尾 |
| `deleteOne(api, addLog, product, runId, accountId)` | 末尾 |
| `batchDelete(api, addLog, products, runId, accountId)` | 末尾 |
| `listOne(api, addLog, product, runId, signal, accountId)` | 末尾 |
| `scanOneByOne(api, addLog, words, runId, signal, accountId)` | 末尾 |
| `batchScan(api, addLog, words, runId, signal, limit, accountId)` | 末尾 |
| `streamDraftProducts(api, signal, accountId)` | 末尾 |

所有调用方（handlers、scheduler）传入对应的 accountId。

## 静默错误吞没修复

| 文件 | 当前 | 修复 |
|---|---|---|
| `ipc/handlers/violation.ts` | `catch {}` | `catch (error) { logger.error('删除违规商品失败:', error); }` |
| `updater.ts` | `autoUpdater.on('error', () => {})` | 传入 error 参数并 `logger.error('自动更新错误:', error)` |
| `updater.ts` | `.catch(() => {})` | `.catch((error) => { logger.error('检查更新失败:', error); })` |
| `main/index.ts` | `catch {}` | 保持不改（进程即将退出），加注释说明 |

## 改动文件清单

**新建：**
- `src/main/utils/logger.ts`

**修改（modules 层，需新增 accountId 参数）：**
- `src/main/modules/task-cycle.ts`
- `src/main/modules/delete-failed-products.ts`
- `src/main/modules/list-unreviewed-products.ts`
- `src/main/modules/violation-detect.ts`
- `src/main/modules/fetch-draft-products.ts`

**修改（handlers/scheduler/store/updater，已有 accountId）：**
- `src/main/ipc/handlers/task.ts`
- `src/main/ipc/handlers/drafts.ts`
- `src/main/ipc/handlers/violation.ts`
- `src/main/ipc/handlers/orders.ts`
- `src/main/scheduler/listing-scheduler.ts`
- `src/main/store/index.ts`
- `src/main/updater.ts`

**不改：** 渲染端日志展示（ListingPage、ViolationPage）不在本次范围内。

## 验证方式

1. `npm run build` 编译通过
2. `npm run dev` 运行，执行任务，检查终端输出格式统一
3. 确认所有 console 输出都有 `[Module:accountId]` 前缀
4. 确认 error 输出包含完整堆栈信息
5. 检查 `userData/logs/main.log` 文件中日志格式正确
