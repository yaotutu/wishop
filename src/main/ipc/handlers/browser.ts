import { ipcMain, BrowserWindow } from 'electron';
import type { ShippingAssistantSession } from '../../../shared/types';
import {
  closeBrowserWindow,
  openCleanBrowserShippingAssistant,
  openCleanBrowserWindow,
  registerShippingAssistantHandlers,
} from '../../browser/browser-window.js';

export function registerBrowserHandlers(): void {
  registerShippingAssistantHandlers();

  ipcMain.handle('browser:open', (event, profileId: string, url?: string) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return;
    openCleanBrowserWindow(win, profileId, url);
  });

  ipcMain.handle('browser:close', () => {
    closeBrowserWindow();
  });

  ipcMain.handle('browser:openClean', (event, profileId: string, url?: string) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return;
    openCleanBrowserWindow(win, profileId, url);
  });

  ipcMain.handle('browser:openShippingAssistant', (event, profileId: string, url: string, session: ShippingAssistantSession) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return;
    openCleanBrowserShippingAssistant(win, profileId, url, session);
  });
}
