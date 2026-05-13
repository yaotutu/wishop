import { IpcMainInvokeEvent } from 'electron';
import { logEmitter } from '../../store';
import type { LogEntry } from '../../../shared/types';

export interface LogForwarder {
  start(): void;
  stop(): void;
}

export function createLogForwarder(
  event: IpcMainInvokeEvent,
  accountId: string,
  channel: string,
): LogForwarder {
  const win = event.sender;
  const eventName = `log-added:${accountId}`;
  const onLog = (log: LogEntry) => {
    if (!win.isDestroyed()) {
      win.send(channel, log);
    }
  };

  return {
    start: () => logEmitter.on(eventName, onLog),
    stop: () => logEmitter.off(eventName, onLog),
  };
}

export async function withLogForwarding<T>(
  event: IpcMainInvokeEvent,
  accountId: string,
  channel: string,
  fn: () => Promise<T>,
): Promise<T> {
  const forwarder = createLogForwarder(event, accountId, channel);
  forwarder.start();
  try {
    return await fn();
  } finally {
    forwarder.stop();
  }
}
