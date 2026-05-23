import { registerBrowserHandlers } from '../browser';
import { registerTaobaoAutomationHandlers } from '../taobaoAutomation';

export function registerBrowserTaobaoDomainHandlers(): void {
  registerBrowserHandlers();
  registerTaobaoAutomationHandlers();
}
