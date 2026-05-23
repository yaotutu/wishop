import { session, webContents } from 'electron';
import type { WebContents } from 'electron';

const CLEAN_PARTITION_PREFIX = 'persist:taobao-clean-';

const cleanBrowserWebContents = new Map<string, number>();
let isQuitting = false;

export function setBrowserQuitting(value: boolean): void {
  isQuitting = value;
}

export function registerCleanBrowserWebContents(profileId: string, webContentsId: number): void {
  cleanBrowserWebContents.set(profileId, webContentsId);
}

export function unregisterCleanBrowserWebContents(profileId: string, webContentsId: number): void {
  if (cleanBrowserWebContents.get(profileId) === webContentsId) {
    cleanBrowserWebContents.delete(profileId);
  }
}

export function getCleanBrowserWebContents(profileId = 'baseline'): WebContents | null {
  const id = cleanBrowserWebContents.get(profileId) || cleanBrowserWebContents.get('baseline');
  if (!id) return null;
  const contents = webContents.fromId(id);
  if (!contents || contents.isDestroyed()) {
    cleanBrowserWebContents.delete(profileId);
    return null;
  }
  return contents;
}

export const getCleanBrowserWindow = getCleanBrowserWebContents;

export async function flushBrowserSession(profileId = 'baseline'): Promise<void> {
  const ses = session.fromPartition(`${CLEAN_PARTITION_PREFIX}${profileId}`);
  ses.flushStorageData();
  await ses.cookies.flushStore();
}

export async function flushBrowserSessionWithTimeout(profileId = 'baseline', timeoutMs = 3000): Promise<boolean> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      flushBrowserSession(profileId).then(() => true),
      new Promise<false>(resolve => {
        timeout = setTimeout(() => resolve(false), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export function hideCleanBrowserWindows(): void {
  cleanBrowserWebContents.clear();
}

export function openCleanBrowserWindow(): WebContents | null {
  return getCleanBrowserWebContents();
}

export function isBrowserQuitting(): boolean {
  return isQuitting;
}
