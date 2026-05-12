import { WeChatClient } from '../wechat/client';
import type { DraftProduct, AddLogFn, TaskConfig, TaskCycleResult } from '../../shared/types';

export type { TaskConfig, TaskCycleResult };
import { streamDraftProducts } from './fetch-draft-products';
import { deleteOne } from './delete-failed-products';
import { listOne } from './list-unreviewed-products';

const CONSECUTIVE_FAIL_THRESHOLD = 3;

export async function runTaskCycle(
  api: WeChatClient,
  addLog: AddLogFn,
  taskConfig: TaskConfig,
  runId: string,
  signal?: AbortSignal,
): Promise<TaskCycleResult> {
  console.log(`[TaskCycle] 开始 (runId=${runId}): 删除失败=${taskConfig.deleteFailed}, 提交未审核=${taskConfig.listUnreviewed}(${taskConfig.listUnreviewedQuantity})`);

  const result: TaskCycleResult = { scanned: 0, deleted: 0, listed: 0, errors: 0, skipped: 0, stopped: false, pendingDelete: [] };
  const pendingDelete: DraftProduct[] = [];
  let listCount = 0;
  let consecutiveMiss = 0;
  let consecutiveFails = 0;
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

  for await (const product of streamDraftProducts(api, signal)) {
    if (signal?.aborted) {
      result.stopped = true;
      result.reason = '用户手动停止';
      console.log(`[TaskCycle] 用户手动停止，已扫描 ${result.scanned} 条`);
      break;
    }

    result.scanned++;
    console.log(`[TaskCycle] 扫描 #${result.scanned}: ${product.title} (edit_status=${product.editStatus})`);

    if (taskConfig.listUnreviewed && listDone()) break;

    if (product.editStatus === 3 && taskConfig.deleteFailed) {
      consecutiveMiss = 0;
      if (taskConfig.deleteFailedConfirm) {
        consecutiveFails = 0;
        pendingDelete.push(product);
        console.log(`[TaskCycle] 标记待删除: ${product.title}`);
      } else {
        const res = await deleteOne(api, trackLog, product, runId);
        if (res === 'success') {
          consecutiveFails = 0;
          result.deleted++;
        } else if (res === 'stopped') {
          result.stopped = true;
          result.reason = '删除操作被限制';
          break;
        } else {
          result.errors++;
          consecutiveFails++;
          if (consecutiveFails >= CONSECUTIVE_FAIL_THRESHOLD) {
            result.stopped = true;
            result.reason = `连续${consecutiveFails}次删除失败，自动停止 (errcode=${lastErrorCode}, ${lastErrorMsg})`;
            console.warn(`[TaskCycle] ${result.reason}`);
            break;
          }
        }
      }
      continue;
    }

    if (product.editStatus === 72 && taskConfig.listUnreviewed && !listDone()) {
      consecutiveMiss = 0;
      const res = await listOne(api, trackLog, product, runId, signal);
      if (res === 'success') {
        consecutiveFails = 0;
        listCount++;
        result.listed++;
      } else if (res === 'skipped') {
        consecutiveFails = 0;
        result.skipped++;
      } else if (res === 'stopped') {
        result.stopped = true;
        result.reason = '提审次数超限';
        break;
      } else {
        result.errors++;
        consecutiveFails++;
        if (consecutiveFails >= CONSECUTIVE_FAIL_THRESHOLD) {
          result.stopped = true;
          result.reason = `连续${consecutiveFails}次上架失败，自动停止 (errcode=${lastErrorCode}, ${lastErrorMsg})`;
          console.warn(`[TaskCycle] ${result.reason}`);
          break;
        }
      }
      continue;
    }

    console.log(`[TaskCycle] 跳过: edit_status=${product.editStatus}, 不匹配当前任务`);
    if (needConsecutiveCheck) {
      consecutiveMiss++;
      if (consecutiveMiss >= 5) {
        console.log(`[TaskCycle] 连续 ${consecutiveMiss} 条未匹配，停止扫描`);
        break;
      }
    }
  }

  result.pendingDelete = pendingDelete;
  console.log(`[TaskCycle] 完成: 扫描=${result.scanned}, 删除=${result.deleted}, 提交=${result.listed}, 待确认删除=${pendingDelete.length}, 停止=${result.stopped}`);
  return result;
}
