import type { WebContents } from 'electron';
import { getCleanBrowserWebContents } from '../browser/browser-window';

const LOAD_TIMEOUT_MS = 20000;

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function waitForTaobaoLoad(contents: WebContents): Promise<void> {
  if (!contents.isLoadingMainFrame()) {
    await sleep(600);
    return;
  }

  await new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, LOAD_TIMEOUT_MS);
    contents.once('did-finish-load', () => {
      clearTimeout(timer);
      resolve();
    });
    contents.once('did-fail-load', () => {
      clearTimeout(timer);
      resolve();
    });
  });
  await sleep(800);
}

export async function loadCleanTaobaoPage(profileId: string, url: string): Promise<WebContents> {
  const contents = getCleanBrowserWebContents(profileId);
  if (!contents) throw new Error('淘宝浏览器未打开');
  if (contents.getURL() !== url) contents.loadURL(url);
  await waitForTaobaoLoad(contents);
  return contents;
}
