import { createScopedAddLog, getConfig, getViolationWords, setViolationWords, getAccount } from '../../store';
import type { ViolationMatch, ViolationScanResult, ViolationScanStepResult } from '../../../shared/types';
import { getClient } from '../../wxshop/client-registry';
import { batchScan, scanOneByOne, batchDeleteViolations } from '../../modules/violation-detect';
import { createLogForwarder, withLogForwarding, LogForwarder } from '../utils/log-forwarding';
import { SessionManager } from '../utils/session-manager';
import { createLogger } from '../../utils/logger';
import { handleIpc } from '../utils/handle-ipc';

export interface ViolationScanSessionState {
  generator: AsyncGenerator<ViolationMatch & { scanned: number }> | null;
  current: (ViolationMatch & { scanned: number }) | null;
  done: boolean;
  logForwarder: LogForwarder;
}

export function registerViolationHandlers(context: {
  scanSessions: SessionManager<ViolationScanSessionState>;
}): void {

  handleIpc('violation:getWords', (_, accountId: string): string[] => {
    return getViolationWords(accountId);
  }, 'Violation');

  handleIpc('violation:setWords', (_, accountId: string, words: string[]): void => {
    setViolationWords(accountId, words);
  }, 'Violation');

  handleIpc('violation:batchScan', async (event, accountId: string, limit?: number): Promise<ViolationScanResult> => {
    const logger = createLogger('Violation', accountId);
    const runId = Date.now().toString();
    const scopedAddLog = createScopedAddLog(accountId);
    const api = getClient(accountId, getConfig(accountId));
    const words = getViolationWords(accountId);

    const account = getAccount(accountId);
    logger.info(`批量扫描开始 店铺=${account?.name || '未知'} appId=${api.config.appId} 词库=${words.length}个 上限=${limit || '全部'}`);

    if (words.length === 0) {
      logger.info(`词库为空，跳过`);
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
  }, 'Violation');

  handleIpc('violation:scanStep', async (event, accountId: string, action: 'next' | 'skip' | 'delete'): Promise<ViolationScanStepResult> => {
    const logger = createLogger('Violation', accountId);
    let session = context.scanSessions.get(accountId);

    if (!session || session.state.done) {
      const words = getViolationWords(accountId);
      if (words.length === 0) {
        return { type: 'done', reason: '词库为空' };
      }
      const account = getAccount(accountId);
      const api = getClient(accountId, getConfig(accountId));
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
      const api = getClient(accountId, getConfig(accountId));

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
        throw error;
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
  }, 'Violation');

  handleIpc('violation:batchDelete', async (event, accountId: string, violations: ViolationMatch[]): Promise<{ deleted: number; errors: number; stopped: boolean }> => {
    const runId = Date.now().toString();
    const scopedAddLog = createScopedAddLog(accountId);
    const api = getClient(accountId, getConfig(accountId));

    return withLogForwarding(event, accountId, `violation:log:${accountId}`, async () => {
      return await batchDeleteViolations(api, scopedAddLog, violations, runId, accountId);
    });
  }, 'Violation');

  handleIpc('violation:stop', (_, accountId: string): void => {
    const session = context.scanSessions.get(accountId);
    if (session) {
      session.state.logForwarder.stop();
      context.scanSessions.stop(accountId);
    }
  }, 'Violation');
}
