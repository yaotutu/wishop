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
  skipKeywords: string[] = [],
): Promise<TaskCycleResult> {
  const logger = createLogger('TaskCycle', accountId);
  logger.info(`开始 (runId=${runId}): 提交未审核=${taskConfig.listUnreviewed}(${taskConfig.listUnreviewedQuantity})`);

  const result: TaskCycleResult = { scanned: 0, deleted: 0, listed: 0, errors: 0, skipped: 0, stopped: false };
  let listCount = 0;
  const errorCodeMap = new Map<number, { count: number; msg: string }>();

  // editStatus=1 提审结果追踪
  const status1Success: { productId: string; title: string }[] = [];
  const status1Failed: { productId: string; title: string; reason: string }[] = [];

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

    // editStatus=1(编辑中) 或 editStatus=72(未审核) → 尝试提审
    if ((product.editStatus === 1 || product.editStatus === 72) && taskConfig.listUnreviewed && !listDone()) {
      const res = await listOne(api, trackLog, product, runId, signal, accountId, blacklistRules, taskConfig.autoDeleteFailed !== false, skipKeywords);
      if (res === 'success') {
        listCount++;
        result.listed++;
        if (product.editStatus === 1) {
          status1Success.push({ productId: product.productId, title: product.title });
        }
      } else if (res === 'stopped') {
        result.stopped = true;
        result.reason = '触发黑名单错误码，停止任务';
        if (product.editStatus === 1) {
          status1Failed.push({ productId: product.productId, title: product.title, reason: '触发黑名单' });
        }
        break;
      } else if (res === 'deleted') {
        result.deleted++;
        if (product.editStatus === 1) {
          status1Failed.push({ productId: product.productId, title: product.title, reason: '提审失败，已删除' });
        }
      } else {
        result.skipped++;
        if (product.editStatus === 1) {
          status1Failed.push({ productId: product.productId, title: product.title, reason: '提审失败，跳过' });
        }
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

    // 其他 editStatus → 跳过
    const statusLabels: Record<number, string> = { 1: '编辑中', 2: '审核中', 4: '成功', 7: '上传中', 8: '上传失败' };
    const label = statusLabels[product.editStatus] || '未知';
    logger.info(`跳过 (edit_status=${product.editStatus} ${label}): ${product.title} (productId=${product.productId})`);
    result.skipped++;
  }

  if (errorCodeMap.size > 0) {
    result.errorCodes = Array.from(errorCodeMap.entries())
      .map(([code, v]) => ({ code, count: v.count, msg: v.msg }))
      .sort((a, b) => b.count - a.count);
  }
  logger.info(`完成: 扫描=${result.scanned}, 上架=${result.listed}, 删除=${result.deleted}, 跳过=${result.skipped}, 错误=${result.errors}, 停止=${result.stopped}`);

  // editStatus=1 汇总
  if (status1Success.length > 0 || status1Failed.length > 0) {
    logger.info(`[editStatus=1 汇总] 总计=${status1Success.length + status1Failed.length}, 成功=${status1Success.length}, 失败=${status1Failed.length}`);
    if (status1Success.length > 0) {
      logger.info(`[editStatus=1 成功] ${status1Success.map(p => `${p.productId}(${p.title})`).join(', ')}`);
    }
    if (status1Failed.length > 0) {
      logger.info(`[editStatus=1 失败] ${status1Failed.map(p => `${p.productId}(${p.title}): ${p.reason}`).join('; ')}`);
    }
  }

  return result;
}
