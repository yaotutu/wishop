import { ipcMain, BrowserWindow } from 'electron';
import { closeBrowserWindow, openCleanBrowserWindow } from '../../browser/browser-window.js';

export function registerBrowserHandlers(): void {
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
}
