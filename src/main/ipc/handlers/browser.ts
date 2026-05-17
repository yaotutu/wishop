import { ipcMain, BrowserWindow } from 'electron';
import { openBrowserWindow, closeBrowserWindow } from '../../browser/browser-window.js';

export function registerBrowserHandlers(): void {
  ipcMain.handle('browser:open', (event, profileId: string, url?: string) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return;
    openBrowserWindow(win, profileId, url);
  });

  ipcMain.handle('browser:close', () => {
    closeBrowserWindow();
  });
}
