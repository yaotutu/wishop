import log from 'electron-log/main';
import { getAccount } from '../store';

export function createLogger(module: string, accountId: string) {
  const account = accountId && accountId !== 'system' ? getAccount(accountId) : undefined;
  const label = account ? `${module}:${account.name}` : `${module}:${accountId}`;
  return log.scope(label);
}

export type AppLogger = ReturnType<typeof log.scope>;

export { log };
