import { WeChatClient, DraftProduct } from '../wechat/client';
import type { AddLogFn, ViolationMatch, ViolationScanResult } from '../../shared/types';
import { streamDraftProducts } from './fetch-draft-products';
import { deleteOne } from './delete-failed-products';

export function findMatches(title: string, words: string[]): string[] {
  const lower = title.toLowerCase();
  return words.filter(w => w && lower.includes(w.toLowerCase()));
}

export async function batchScan(
  api: WeChatClient,
  addLog: AddLogFn,
  words: string[],
  runId: string,
  signal?: AbortSignal,
  limit?: number,
): Promise<ViolationScanResult> {
  const result: ViolationScanResult = { scanned: 0, violations: [], errors: 0, stopped: false };

  console.log(`[ViolationScan] 开始违规词检测，词库共 ${words.length} 个词，扫描上限 ${limit || '全部'}`);
  addLog({ runId, productId: '', productTitle: `开始违规词检测，词库共 ${words.length} 个词，扫描上限 ${limit || '全部'}`, action: 'check', status: 'success' });

  for await (const product of streamDraftProducts(api, signal)) {
    if (signal?.aborted) {
      result.stopped = true;
      result.reason = '用户手动停止';
      console.log(`[ViolationScan] 用户手动停止`);
      break;
    }
    result.scanned++;
    if (product.editStatus !== 72) continue;
    console.log(`[ViolationScan] #${result.scanned} id=${product.productId} editStatus=${product.editStatus} ${product.title}`);
    const matched = findMatches(product.title, words);
    if (matched.length > 0) {
      console.log(`[ViolationScan] ↑ 匹配违规词: [${matched.join(', ')}]`);
      addLog({
        runId,
        productId: product.productId,
        productTitle: product.title,
        action: 'check',
        status: 'failed',
        errorMsg: `匹配到违规词: ${matched.join(', ')}`,
      });
      result.violations.push({ productId: product.productId, title: product.title, matchedWords: matched });
    }
    if (result.scanned % 30 === 0) {
      console.log(`[ViolationScan] 进度: 已扫描 ${result.scanned} 条，发现 ${result.violations.length} 条违规`);
      addLog({ runId, productId: '', productTitle: `已扫描 ${result.scanned} 条商品，发现 ${result.violations.length} 条违规`, action: 'check', status: 'success' });
    }
    if (limit && result.scanned >= limit) {
      console.log(`[ViolationScan] 已达到扫描上限 ${limit} 条`);
      addLog({ runId, productId: '', productTitle: `已达到扫描上限 ${limit} 条，停止扫描`, action: 'check', status: 'success' });
      break;
    }
  }

  console.log(`[ViolationScan] 完成: 共扫描 ${result.scanned} 条，发现 ${result.violations.length} 条违规`);
  addLog({ runId, productId: '', productTitle: `扫描完成: 共扫描 ${result.scanned} 条，发现 ${result.violations.length} 条违规`, action: 'check', status: result.violations.length > 0 ? 'failed' : 'success' });
  return result;
}

export async function* scanOneByOne(
  api: WeChatClient,
  addLog: AddLogFn,
  words: string[],
  runId: string,
  signal?: AbortSignal,
): AsyncGenerator<ViolationMatch & { scanned: number }> {
  console.log(`[ViolationOneByOne] 开始逐个检测，词库共 ${words.length} 个词`);
  addLog({ runId, productId: '', productTitle: `开始逐个违规词检测，词库共 ${words.length} 个词`, action: 'check', status: 'success' });
  let scanned = 0;
  for await (const product of streamDraftProducts(api, signal)) {
    if (signal?.aborted) {
      console.log(`[ViolationOneByOne] 用户手动停止，已扫描 ${scanned} 条`);
      return;
    }
    scanned++;
    if (product.editStatus !== 72) continue;
    console.log(`[ViolationOneByOne] #${scanned} id=${product.productId} editStatus=${product.editStatus} ${product.title}`);
    const matched = findMatches(product.title, words);
    if (matched.length > 0) {
      console.log(`[ViolationOneByOne] ↑ 匹配违规词: [${matched.join(', ')}]`);
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
      console.log(`[ViolationOneByOne] 进度: 已扫描 ${scanned} 条`);
      addLog({ runId, productId: '', productTitle: `已扫描 ${scanned} 条商品`, action: 'check', status: 'success' });
    }
  }
  console.log(`[ViolationOneByOne] 完成: 共扫描 ${scanned} 条`);
  addLog({ runId, productId: '', productTitle: `逐个扫描完成: 共扫描 ${scanned} 条`, action: 'check', status: 'success' });
}

export async function batchDeleteViolations(
  api: WeChatClient,
  addLog: AddLogFn,
  products: ViolationMatch[],
  runId: string,
): Promise<{ deleted: number; errors: number; stopped: boolean }> {
  let deleted = 0;
  let errors = 0;
  let stopped = false;

  console.log(`[ViolationDelete] 开始删除 ${products.length} 条违规商品`);
  for (const v of products) {
    const product: DraftProduct = {
      productId: v.productId,
      title: v.title,
      headImgs: [],
      status: 0,
      editStatus: 0,
    };
    const res = await deleteOne(api, addLog, product, runId);
    if (res === 'success') {
      deleted++;
    } else if (res === 'stopped') {
      stopped = true;
      console.log(`[ViolationDelete] 全局限制，停止删除`);
      break;
    } else {
      errors++;
    }
  }
  console.log(`[ViolationDelete] 完成: 删除 ${deleted}，失败 ${errors}，停止 ${stopped}`);
  return { deleted, errors, stopped };
}
