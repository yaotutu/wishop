import { ipcMain, type IpcMainInvokeEvent } from 'electron';
import { getErrorMessage } from '../../../shared/errors';
import { createLogger } from '../../utils/logger';

type IpcHandler<Args extends unknown[], Result> = (
  event: IpcMainInvokeEvent,
  ...args: Args
) => Result | Promise<Result>;

export function handleIpc<Args extends unknown[], Result>(
  channel: string,
  handler: IpcHandler<Args, Result>,
  loggerScope = 'IPC',
): void {
  ipcMain.handle(channel, async (event, ...args: unknown[]) => {
    try {
      return await handler(event, ...(args as Args));
    } catch (error: unknown) {
      const accountId = typeof args[0] === 'string' ? args[0] : 'system';
      const logger = createLogger(loggerScope, accountId);
      logger.error(`${channel} 失败:`, error);
      throw new Error(getErrorMessage(error));
    }
  });
}
