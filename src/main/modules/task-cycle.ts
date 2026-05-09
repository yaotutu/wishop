import { streamDraftProducts } from './fetch-draft-products';
import { deleteOne } from './delete-failed-products';
import { listOne } from './list-unreviewed-products';

export interface TaskConfig {
  deleteFailed: boolean;
  listUnreviewed: boolean;
  deleteFailedQuantity: number;
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

export async function runTaskCycle(config: TaskConfig): Promise<TaskCycleResult> {
  console.log(`[TaskCycle] 开始: 删除失败=${config.deleteFailed}(${config.deleteFailedQuantity}), 提交未审核=${config.listUnreviewed}(${config.listUnreviewedQuantity})`);

  const result: TaskCycleResult = { scanned: 0, deleted: 0, listed: 0, errors: 0, skipped: 0, stopped: false };
  let deleteCount = 0;
  let listCount = 0;
  const deleteDone = () => !config.deleteFailed || deleteCount >= config.deleteFailedQuantity;
  const listDone = () => !config.listUnreviewed || listCount >= config.listUnreviewedQuantity;
  const allDone = () => deleteDone() && listDone();

  for await (const product of streamDraftProducts()) {
    result.scanned++;

    if (allDone()) break;

    // edit_status=3 且开启了删除任务
    if (product.editStatus === 3 && !deleteDone()) {
      const ok = await deleteOne(product);
      if (ok) {
        deleteCount++;
        result.deleted++;
      } else {
        result.errors++;
      }
      continue;
    }

    // edit_status=72 且开启了提交任务
    if (product.editStatus === 72 && !listDone()) {
      const res = await listOne(product);
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
  }

  console.log(`[TaskCycle] 完成: 扫描=${result.scanned}, 删除=${result.deleted}, 提交=${result.listed}, 停止=${result.stopped}`);
  return result;
}
