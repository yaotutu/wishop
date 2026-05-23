import type { BrowserWindow } from 'electron';
import { getCleanBrowserWindow, openCleanBrowserWindow } from '../browser/browser-window';

const LOAD_TIMEOUT_MS = 20000;

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function waitForTaobaoLoad(win: BrowserWindow): Promise<void> {
  if (!win.webContents.isLoadingMainFrame()) {
    await sleep(600);
    return;
  }

  await new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, LOAD_TIMEOUT_MS);
    win.webContents.once('did-finish-load', () => {
      clearTimeout(timer);
      resolve();
    });
    win.webContents.once('did-fail-load', () => {
      clearTimeout(timer);
      resolve();
    });
  });
  await sleep(800);
}

export async function loadCleanTaobaoPage(parent: BrowserWindow, profileId: string, url: string): Promise<BrowserWindow> {
  openCleanBrowserWindow(parent, profileId, url);
  const win = getCleanBrowserWindow();
  if (!win) throw new Error('淘宝窗口未打开');
  await waitForTaobaoLoad(win);
  return win;
}

