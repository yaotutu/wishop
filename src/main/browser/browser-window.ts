import { hideCleanBrowserWindows } from './clean-taobao-window.js';

export {
  flushBrowserSession,
  flushBrowserSessionWithTimeout,
  getCleanBrowserWebContents,
  getCleanBrowserWindow,
  hideCleanBrowserWindows,
  isBrowserQuitting,
  registerCleanBrowserWebContents,
  setBrowserQuitting,
  unregisterCleanBrowserWebContents,
} from './clean-taobao-window.js';

export { registerShippingAssistantHandlers } from './shipping-assistant-window.js';

export function closeBrowserWindow(): void {
  hideCleanBrowserWindows();
}
