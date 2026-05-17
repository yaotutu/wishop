import { ipcMain, BrowserWindow } from 'electron';
import { openBrowserWindow, closeBrowserWindow } from '../../browser/browser-window.js';

export function registerBrowserHandlers(): void {
  ipcMain.handle('browser:open', async (event, profileId: string, url?: string, keyword?: string) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return '窗口不存在';
    return openBrowserWindow(win, profileId, url, keyword);
  });

  ipcMain.handle('browser:close', () => {
    closeBrowserWindow();
  });
}
