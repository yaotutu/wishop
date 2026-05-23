import type { BrowserWindow } from 'electron';
import type { ShippingAssistantSession } from '../../shared/types';
import {
  flushBrowserSession,
  flushBrowserSessionWithTimeout,
  getCleanBrowserWindow,
  hideCleanBrowserWindows,
  openCleanBrowserWindow,
  setBrowserQuitting,
} from './clean-taobao-window.js';
import {
  closeShippingAssistantWindows,
  openShippingAssistantWindow,
  registerShippingAssistantHandlers,
} from './shipping-assistant-window.js';

export function openCleanBrowserShippingAssistant(
  parent: BrowserWindow,
  profileId: string,
  url: string,
  session: ShippingAssistantSession,
): void {
  const taobaoWindow = openCleanBrowserWindow(parent, profileId, url);
  openShippingAssistantWindow(taobaoWindow, profileId, session);
}

export {
  flushBrowserSession,
  flushBrowserSessionWithTimeout,
  getCleanBrowserWindow,
  openCleanBrowserWindow,
  registerShippingAssistantHandlers,
  setBrowserQuitting,
};

export function closeBrowserWindow(): void {
  closeShippingAssistantWindows();
  hideCleanBrowserWindows();
}
