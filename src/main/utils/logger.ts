import log from 'electron-log/main';

export function createLogger(module: string, accountId: string) {
  return log.scope(`${module}:${accountId}`);
}

export { log };
