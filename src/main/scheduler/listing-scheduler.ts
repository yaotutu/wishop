import cron from 'node-cron';
import { getScheduler, setScheduler, addLog } from '../store';
import {
  getDraftProducts,
  getProductDetail,
  listProduct,
  getAuditQuota,
} from '../ipc/wechat-api';

let scheduledTask: cron.ScheduledTask | null = null;

function getTodayDateString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

async function executeListing(): Promise<void> {
  const scheduler = getScheduler();

  const today = getTodayDateString();
  if (scheduler.lastRunDate !== today) {
    scheduler.todayListedCount = 0;
    scheduler.lastRunDate = today;
    setScheduler(scheduler);
  }

  if (scheduler.todayListedCount >= scheduler.dailyLimit) {
    console.log('今日上架次数已达上限，停止执行');
    return;
  }

  try {
    const quota = await getAuditQuota();
    if (quota.quota <= 0) {
      console.log('配额已用完，停止执行');
      return;
    }

    let result = await getDraftProducts();
    let totalListed = 0;
    const limit = Math.min(scheduler.dailyLimit - scheduler.todayListedCount, quota.quota);

    while (result.productIds.length > 0 && totalListed < limit) {
      for (const productId of result.productIds) {
        if (totalListed >= limit) break;

        const product = await getProductDetail(productId);
        const listingResult = await listProduct(productId);

        if (listingResult.errcode === 0) {
          addLog({
            productId,
            productTitle: product.title,
            status: 'success',
          });
          totalListed++;
          scheduler.todayListedCount++;
        } else if (listingResult.errcode === 10020111) {
          addLog({
            productId,
            productTitle: product.title,
            status: 'failed',
            errorCode: listingResult.errcode,
            errorMsg: '每日提审限额超限',
          });
          console.log('每日提审限额超限，停止执行');
          setScheduler(scheduler);
          return;
        } else if (listingResult.errcode === 10020066) {
          addLog({
            productId,
            productTitle: product.title,
            status: 'failed',
            errorCode: listingResult.errcode,
            errorMsg: '小时级审核配额超限',
          });
          console.log('小时级审核配额超限，等待下一小时重试');
          setScheduler(scheduler);
          return;
        } else {
          addLog({
            productId,
            productTitle: product.title,
            status: 'failed',
            errorCode: listingResult.errcode,
            errorMsg: listingResult.errmsg,
          });
        }
      }

      if (result.hasMore && totalListed < limit) {
        result = await getDraftProducts(50, result.nextKey);
      } else {
        break;
      }
    }

    setScheduler(scheduler);
    console.log(`定时上架执行完成，共上架 ${totalListed} 个商品`);
  } catch (error) {
    console.error('定时上架执行失败:', error);
  }
}

export function startScheduler(): void {
  const scheduler = getScheduler();

  if (scheduledTask) {
    scheduledTask.stop();
  }

  if (!scheduler.enabled) {
    console.log('定时任务未启用');
    return;
  }

  const cronExpression = scheduler.cronExpression;
  if (!cron.validate(cronExpression)) {
    console.error(`无效的 cron 表达式: ${cronExpression}`);
    return;
  }

  scheduledTask = cron.schedule(cronExpression, executeListing);
  console.log(`定时任务已启动，cron: ${cronExpression}`);
}

export function stopScheduler(): void {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    console.log('定时任务已停止');
  }
}
