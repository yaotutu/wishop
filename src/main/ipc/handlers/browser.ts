import { ipcMain } from 'electron';
import {
  closeBrowserWindow,
  registerCleanBrowserWebContents,
  registerShippingAssistantHandlers,
  unregisterCleanBrowserWebContents,
} from '../../browser/browser-window.js';

export function registerBrowserHandlers(): void {
  registerShippingAssistantHandlers();

  ipcMain.handle('browser:registerTaobaoWebContents', (_event, profileId: string, webContentsId: number) => {
    registerCleanBrowserWebContents(profileId, webContentsId);
  });

  ipcMain.handle('browser:unregisterTaobaoWebContents', (_event, profileId: string, webContentsId: number) => {
    unregisterCleanBrowserWebContents(profileId, webContentsId);
  });

  ipcMain.handle('browser:open', () => undefined);

  ipcMain.handle('browser:close', () => {
    closeBrowserWindow();
  });

  ipcMain.handle('browser:openClean', () => undefined);

  ipcMain.handle('browser:openShippingAssistant', () => undefined);
}
