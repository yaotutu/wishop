import { BrowserWindow, session } from 'electron';

const CLEAN_PARTITION_PREFIX = 'persist:taobao-clean-';

const cleanBrowserWindows = new Map<string, BrowserWindow>();
let isQuitting = false;

export function setBrowserQuitting(value: boolean): void {
  isQuitting = value;
}

export async function flushBrowserSession(profileId = 'baseline'): Promise<void> {
  const ses = session.fromPartition(`${CLEAN_PARTITION_PREFIX}${profileId}`);
  ses.flushStorageData();
  await ses.cookies.flushStore();
}

export function openCleanBrowserWindow(parent: BrowserWindow, profileId: string, url = 'https://www.taobao.com'): void {
  const existingWindow = cleanBrowserWindows.get(profileId);
  if (existingWindow && !existingWindow.isDestroyed()) {
    existingWindow.show();
    existingWindow.focus();
    if (existingWindow.webContents.getURL() !== url) {
      existingWindow.loadURL(url);
    }
    return;
  }

  const partition = `${CLEAN_PARTITION_PREFIX}${profileId}`;
  const parentBounds = parent.getBounds();
  const width = Math.min(1280, Math.floor(parentBounds.width * 0.9));
  const height = Math.min(860, Math.floor(parentBounds.height * 0.9));
  const x = parentBounds.x + Math.floor((parentBounds.width - width) / 2);
  const y = parentBounds.y + Math.floor((parentBounds.height - height) / 2);

  const cleanBrowserWindow = new BrowserWindow({
    width,
    height,
    x,
    y,
    parent,
    closable: true,
    minimizable: true,
    maximizable: true,
    resizable: true,
    title: '淘宝',
    webPreferences: {
      partition,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  cleanBrowserWindow.webContents.setWindowOpenHandler(({ url: newUrl }) => {
    cleanBrowserWindow.loadURL(newUrl);
    return { action: 'deny' };
  });

  cleanBrowserWindow.on('close', (event) => {
    if (isQuitting) return;
    event.preventDefault();
    cleanBrowserWindow.hide();
  });

  cleanBrowserWindow.on('closed', () => {
    cleanBrowserWindows.delete(profileId);
  });

  cleanBrowserWindows.set(profileId, cleanBrowserWindow);
  cleanBrowserWindow.loadURL(url);
}

export function getCleanBrowserWindow(): BrowserWindow | null {
  return cleanBrowserWindows.get('baseline') || cleanBrowserWindows.values().next().value || null;
}

export function closeBrowserWindow(): void {
  cleanBrowserWindows.forEach(win => {
    if (!win.isDestroyed()) win.hide();
  });
}
