import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { getConfig, createScopedAddLog, getViolationWords, setViolationWords, logEmitter, getAccount } from '../../store';
import type { ViolationMatch, ViolationScanResult, LogEntry, AddLogFn } from '../../../shared/types';
import { createWeChatClient } from '../../wechat/client';
import { batchScan, scanOneByOne, batchDeleteViolations } from '../../modules/violation-detect';

interface ScanSession {
  generator: AsyncGenerator<ViolationMatch & { scanned: number }>;
  controller: AbortController;
  current: (ViolationMatch & { scanned: number }) | null;
  done: boolean;
  cleanup: () => void;
}

export function registerViolationHandlers(context: {
  scanSessions: Map<string, ScanSession>;
}): void {

  ipcMain.handle('violation:getWords', (_, accountId: string): string[] => {
    return getViolationWords(accountId);
  });

  ipcMain.handle('violation:setWords', (_, accountId: string, words: string[]): void => {
    setViolationWords(accountId, words);
  });

  ipcMain.handle('violation:batchScan', async (event: IpcMainInvokeEvent, accountId: string, limit?: number): Promise<ViolationScanResult> => {
    const runId = Date.now().toString();
    const scopedAddLog = createScopedAddLog(accountId);
    const api = createWeChatClient(getConfig(accountId));
    const words = getViolationWords(accountId);

    const account = getAccount(accountId);
    console.log(`[Violation] 批量扫描开始 店铺=${account?.name || '未知'} appId=${api.config.appId} 词库=${words.length}个 上限=${limit || '全部'}`);

    if (words.length === 0) {
      console.log(`[Violation] 词库为空，跳过`);
      return { scanned: 0, violations: [], errors: 0, stopped: false, reason: '词库为空' };
    }

    const win = event.sender;
    const onLog = (log: LogEntry) => {
      if (!win.isDestroyed()) {
        win.send(`violation:log:${accountId}`, log);
      }
    };
    logEmitter.on(`log-added:${accountId}`, onLog);

    const controller = new AbortController();
    // Store controller so violation:stop can abort it
    context.scanSessions.set(accountId, { generator: null as any, controller, current: null, done: false, cleanup: () => logEmitter.off(`log-added:${accountId}`, onLog) });
    try {
      const result = await batchScan(api, scopedAddLog, words, runId, controller.signal, limit);
      return result;
    } finally {
      context.scanSessions.delete(accountId);
      logEmitter.off(`log-added:${accountId}`, onLog);
    }
  });

  ipcMain.handle('violation:scanStep', async (event: IpcMainInvokeEvent, accountId: string, action: 'next' | 'skip' | 'delete'): Promise<any> => {
    let session = context.scanSessions.get(accountId);

    if (!session || session.done) {
      const words = getViolationWords(accountId);
      if (words.length === 0) {
        return { type: 'done', reason: '词库为空' };
      }
      const account = getAccount(accountId);
      const api = createWeChatClient(getConfig(accountId));
      console.log(`[Violation] 逐个扫描开始 店铺=${account?.name || '未知'} appId=${api.config.appId} 词库=${words.length}个`);
      const scopedAddLog = createScopedAddLog(accountId);
      const runId = Date.now().toString();
      const controller = new AbortController();

      // Subscribe log forwarding for the entire one-by-one session
      const win = event.sender;
      const onLog = (log: LogEntry) => {
        if (!win.isDestroyed()) {
          win.send(`violation:log:${accountId}`, log);
        }
      };
      logEmitter.on(`log-added:${accountId}`, onLog);

      const generator = scanOneByOne(api, scopedAddLog, words, runId, controller.signal);
      const cleanup = () => logEmitter.off(`log-added:${accountId}`, onLog);
      session = { generator, controller, current: null, done: false, cleanup };
      context.scanSessions.set(accountId, session);
    }

    // Handle delete action for current violation
    if (action === 'delete' && session.current) {
      const scopedAddLog = createScopedAddLog(accountId);
      const runId = Date.now().toString();
      const api = createWeChatClient(getConfig(accountId));

      try {
        const result = await batchDeleteViolations(api, scopedAddLog, [session.current], runId);
        if (result.stopped) {
          session.done = true;
          session.controller.abort();
          session.cleanup();
          context.scanSessions.delete(accountId);
          return { type: 'stopped', reason: '删除触发全局限制' };
        }
      } catch {}
    }

    // Advance to next violation
    const next = await session.generator.next();
    if (next.done) {
      session.done = true;
      session.cleanup();
      context.scanSessions.delete(accountId);
      return { type: 'done', scanned: session.current?.scanned || 0 };
    }

    session.current = next.value;
    return { type: 'violation', ...next.value };
  });

  ipcMain.handle('violation:batchDelete', async (event: IpcMainInvokeEvent, accountId: string, violations: ViolationMatch[]): Promise<{ deleted: number; errors: number; stopped: boolean }> => {
    const runId = Date.now().toString();
    const scopedAddLog = createScopedAddLog(accountId);
    const api = createWeChatClient(getConfig(accountId));

    const win = event.sender;
    const onLog = (log: LogEntry) => {
      if (!win.isDestroyed()) {
        win.send(`violation:log:${accountId}`, log);
      }
    };
    logEmitter.on(`log-added:${accountId}`, onLog);

    try {
      return await batchDeleteViolations(api, scopedAddLog, violations, runId);
    } finally {
      logEmitter.off(`log-added:${accountId}`, onLog);
    }
  });

  ipcMain.handle('violation:stop', (_, accountId: string): void => {
    const session = context.scanSessions.get(accountId);
    if (session) {
      session.controller.abort();
      session.done = true;
      session.cleanup();
      context.scanSessions.delete(accountId);
    }
  });
}
