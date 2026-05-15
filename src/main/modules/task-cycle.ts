import { WxShopClient } from '../wxshop/client';
import type { DraftProduct, AddLogFn, TaskConfig, TaskCycleResult, BlacklistRule } from '../../shared/types';
import { createLogger } from '../utils/logger';

export type { TaskConfig, TaskCycleResult };
import { streamDraftProducts } from './fetch-draft-products';
import { deleteOne } from './delete-failed-products';
import { listOne } from './list-unreviewed-products';

export async function runTaskCycle(
  api: WxShopClient,
  addLog: AddLogFn,
  taskConfig: TaskConfig,
  runId: string,
  signal?: AbortSignal,
  accountId: string = '',
  blacklistRules: BlacklistRule[] = [],
): Promise<TaskCycleResult> {
  const logger = createLogger('TaskCycle', accountId);
  logger.info(`开始 (runId=${runId}): 提交未审核=${taskConfig.listUnreviewed}(${taskConfig.listUnreviewedQuantity})`);

  const result: TaskCycleResult = { scanned: 0, deleted: 0, listed: 0, errors: 0, skipped: 0, stopped: false };
  let listCount = 0;
  const errorCodeMap = new Map<number, { count: number; msg: string }>();

  const listDone = () => !taskConfig.listUnreviewed || listCount >= taskConfig.listUnreviewedQuantity;

  const trackLog: AddLogFn = (log) => {
    if (log.status === 'failed') {
      if (log.errorCode != null) {
        const existing = errorCodeMap.get(log.errorCode);
        if (existing) existing.count++;
        else errorCodeMap.set(log.errorCode, { count: 1, msg: log.errorMsg || '' });
      }
      if (log.errorMsg) {
        const subCodeRegex = /错误码:(\d+)/g;
        let match;
        while ((match = subCodeRegex.exec(log.errorMsg)) !== null) {
          const subCode = parseInt(match[1], 10);
          const existing = errorCodeMap.get(subCode);
          if (existing) existing.count++;
          else errorCodeMap.set(subCode, { count: 1, msg: log.errorMsg || '' });
        }
      }
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

    // editStatus=72 → 尝试上架
    if (product.editStatus === 72 && taskConfig.listUnreviewed && !listDone()) {
      const res = await listOne(api, trackLog, product, runId, signal, accountId, blacklistRules, taskConfig.autoDeleteFailed !== false);
      if (res === 'success') {
        listCount++;
        result.listed++;
      } else if (res === 'stopped') {
        result.stopped = true;
        result.reason = '触发黑名单错误码，停止任务';
        break;
      } else if (res === 'deleted') {
        result.deleted++;
      } else {
        result.skipped++;
      }
      continue;
    }

    // editStatus=3 → 直接删除
    if (product.editStatus === 3) {
      const res = await deleteOne(api, trackLog, product, runId, accountId);
      if (res === 'success') {
        result.deleted++;
      } else if (res === 'stopped') {
        result.stopped = true;
        result.reason = '删除操作被限制';
        break;
      } else {
        result.errors++;
      }
      continue;
    }

    // 其他 editStatus → 跳过，打日志观察
    logger.warn(`未知 editStatus=${product.editStatus}: ${product.title} (productId=${product.productId})`);
    result.skipped++;
  }

  if (errorCodeMap.size > 0) {
    result.errorCodes = Array.from(errorCodeMap.entries())
      .map(([code, v]) => ({ code, count: v.count, msg: v.msg }))
      .sort((a, b) => b.count - a.count);
  }
  logger.info(`完成: 扫描=${result.scanned}, 上架=${result.listed}, 删除=${result.deleted}, 跳过=${result.skipped}, 错误=${result.errors}, 停止=${result.stopped}`);
  return result;
}
