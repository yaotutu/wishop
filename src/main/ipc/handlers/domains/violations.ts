import { registerViolationHandlers } from '../violation';

type ViolationsContext = Parameters<typeof registerViolationHandlers>[0];

export function registerViolationsDomainHandlers(context: ViolationsContext): void {
  registerViolationHandlers(context);
}
