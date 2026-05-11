import { WeChatClient, DraftProduct } from '../wechat/client';
import { AddLogFn } from '../store';
import { streamDraftProducts } from './fetch-draft-products';
import { deleteOne } from './delete-failed-products';
import { listOne } from './list-unreviewed-products';

export interface TaskConfig {
  deleteFailed: boolean;
  deleteFailedConfirm: boolean;
  listUnreviewed: boolean;
  listUnreviewedQuantity: number;
}

export interface TaskCycleResult {
  scanned: number;
  deleted: number;
  listed: number;
  errors: number;
  skipped: number;
  stopped: boolean;
  reason?: string;
  pendingDelete: DraftProduct[];
}

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
  const listDone = () => !taskConfig.listUnreviewed || listCount >= taskConfig.listUnreviewedQuantity;
  const needConsecutiveCheck = taskConfig.deleteFailed && !taskConfig.listUnreviewed;

  for await (const product of streamDraftProducts(api)) {
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
        pendingDelete.push(product);
        console.log(`[TaskCycle] 标记待删除: ${product.title}`);
      } else {
        const res = await deleteOne(api, addLog, product, runId);
        if (res === 'success') {
          result.deleted++;
        } else if (res === 'stopped') {
          result.stopped = true;
          result.reason = '删除操作被限制';
          break;
        } else {
          result.errors++;
        }
      }
      continue;
    }

    if (product.editStatus === 72 && taskConfig.listUnreviewed && !listDone()) {
      consecutiveMiss = 0;
      const res = await listOne(api, addLog, product, runId);
      if (res === 'success') {
        listCount++;
        result.listed++;
      } else if (res === 'skipped') {
        result.skipped++;
      } else if (res === 'stopped') {
        result.stopped = true;
        result.reason = '提审次数超限';
        break;
      } else {
        result.errors++;
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
