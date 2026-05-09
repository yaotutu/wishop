import { streamDraftProducts } from './fetch-draft-products';
import { deleteOne } from './delete-failed-products';
import { listOne } from './list-unreviewed-products';

export interface TaskConfig {
  deleteFailed: boolean;
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
}

export async function runTaskCycle(config: TaskConfig, runId: string): Promise<TaskCycleResult> {
  console.log(`[TaskCycle] 开始 (runId=${runId}): 删除失败=${config.deleteFailed}, 提交未审核=${config.listUnreviewed}(${config.listUnreviewedQuantity})`);

  const result: TaskCycleResult = { scanned: 0, deleted: 0, listed: 0, errors: 0, skipped: 0, stopped: false };
  let listCount = 0;
  let consecutiveMiss = 0;
  const listDone = () => !config.listUnreviewed || listCount >= config.listUnreviewedQuantity;
  // 只勾删除时，连续未匹配上限防止扫全量
  const needConsecutiveCheck = config.deleteFailed && !config.listUnreviewed;

  for await (const product of streamDraftProducts()) {
    result.scanned++;
    console.log(`[TaskCycle] 扫描 #${result.scanned}: ${product.title} (edit_status=${product.editStatus})`);

    if (config.listUnreviewed && listDone()) break;

    if (product.editStatus === 3 && config.deleteFailed) {
      consecutiveMiss = 0;
      const res = await deleteOne(product, runId);
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

    if (product.editStatus === 72 && config.listUnreviewed && !listDone()) {
      consecutiveMiss = 0;
      const res = await listOne(product, runId);
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

    // 不匹配任何任务
    console.log(`[TaskCycle] 跳过: edit_status=${product.editStatus}, 不匹配当前任务`);
    if (needConsecutiveCheck) {
      consecutiveMiss++;
      if (consecutiveMiss >= 5) {
        console.log(`[TaskCycle] 连续 ${consecutiveMiss} 条未匹配，停止扫描`);
        break;
      }
    }
  }

  console.log(`[TaskCycle] 完成: 扫描=${result.scanned}, 删除=${result.deleted}, 提交=${result.listed}, 停止=${result.stopped}`);
  return result;
}
