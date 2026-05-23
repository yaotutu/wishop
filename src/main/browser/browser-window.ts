import {
  flushBrowserSession,
  getCleanBrowserWindow,
  hideCleanBrowserWindows,
  openCleanBrowserWindow,
  setBrowserQuitting,
} from './clean-taobao-window.js';
import {
  closeShippingAssistantWindows,
  openCleanBrowserShippingAssistant,
  registerShippingAssistantHandlers,
} from './shipping-assistant-window.js';

export {
  flushBrowserSession,
  getCleanBrowserWindow,
  openCleanBrowserShippingAssistant,
  openCleanBrowserWindow,
  registerShippingAssistantHandlers,
  setBrowserQuitting,
};

export function closeBrowserWindow(): void {
  closeShippingAssistantWindows();
  hideCleanBrowserWindows();
}
