import { ipcMain, BrowserWindow } from 'electron';
import { openBrowserView, hideBrowserView, setBrowserBounds, navigateBack, navigateForward, navigateRefresh, navigateStop } from '../../browser/browser-window.js';

export function registerBrowserHandlers(): void {
  ipcMain.handle('browser:open', (event, profileId: string, url?: string) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return;
    openBrowserView(win, profileId, url);
  });

  ipcMain.handle('browser:close', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return;
    hideBrowserView(win);
  });

  ipcMain.handle('browser:setBounds', (_event, x: number, y: number, width: number, height: number) => {
    setBrowserBounds(x, y, width, height);
  });

  ipcMain.handle('browser:back', () => navigateBack());
  ipcMain.handle('browser:forward', () => navigateForward());
  ipcMain.handle('browser:refresh', () => navigateRefresh());
  ipcMain.handle('browser:stop', () => navigateStop());
}
