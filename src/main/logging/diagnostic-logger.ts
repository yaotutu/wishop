import type { ActivityLogDomain } from '../../shared/activity-log';
import { createLogger } from '../utils/logger';

export interface DiagnosticLoggerContext {
  domain: ActivityLogDomain;
  component: string;
  accountId?: string;
}

function scopedLogger(context: DiagnosticLoggerContext) {
  return createLogger(`${context.domain}:${context.component}`, context.accountId || 'system');
}

export function createDiagnosticLogger(context: DiagnosticLoggerContext) {
  const logger = scopedLogger(context);
  return {
    info: (message: string, ...args: unknown[]) => logger.info(message, ...args),
    warn: (message: string, ...args: unknown[]) => logger.warn(message, ...args),
    error: (message: string, ...args: unknown[]) => {
      const [first, ...rest] = args;
      if (first instanceof Error) {
        logger.error(message, first, ...rest);
        return;
      }
      logger.error(message, ...args);
    },
  };
}
