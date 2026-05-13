import { app, BrowserWindow, session } from 'electron';
import fs from 'fs';
import path from 'path';
import { FingerprintGenerator } from 'fingerprint-generator';
import { FingerprintInjector } from 'fingerprint-injector';
import Store from 'electron-store';
import type { BrowserFingerprintWithHeaders } from 'fingerprint-generator';

const PARTITION_PREFIX = 'persist:taobao-';

interface BrowserConfig {
  preloadPath: string;
  userAgent: string;
}

const store = new Store<{ fingerprints?: Record<string, BrowserFingerprintWithHeaders> }>();

const generator = new FingerprintGenerator({
  browsers: [{ name: 'chrome', minVersion: 134, maxVersion: 138 }],
  devices: ['desktop'],
  locales: ['zh-CN', 'zh'],
});

const injector = new FingerprintInjector();
const configs = new Map<string, BrowserConfig>();
let browserWindow: BrowserWindow | null = null;
let isQuitting = false;

export function setBrowserQuitting(v: boolean) {
  isQuitting = v;
}

export async function flushBrowserSession(profileId = 'default'): Promise<void> {
  const partition = `${PARTITION_PREFIX}${profileId}`;
  const ses = session.fromPartition(partition);
  ses.flushStorageData();
  await ses.cookies.flushStore();
}

function prepare(profileId: string): BrowserConfig {
  const existing = configs.get(profileId);
  if (existing) return existing;

  const fingerprints = store.get('fingerprints', {});
  let fp = fingerprints[profileId];
  if (!fp) {
    fp = generator.getFingerprint();
    fingerprints[profileId] = fp;
    store.set('fingerprints', fingerprints);
  }

  const injectionScript = injector.getInjectableScript(fp);
  const dir = path.join(app.getPath('userData'), 'browser-preloads');
  fs.mkdirSync(dir, { recursive: true });
  const preloadPath = path.join(dir, `${profileId}.js`);

  const permissionsOverride = `
;(function patchPermissions() {
  const stateMap = {
    notifications: Notification.permission,
    geolocation: 'prompt',
    camera: 'prompt',
    microphone: 'prompt',
    midi: 'prompt',
    'clipboard-read': 'prompt',
    'clipboard-write': 'prompt',
    'payment-handler': 'prompt',
    'persistent-storage': 'prompt',
    'screen-wake-lock': 'prompt',
    accelerometer: 'prompt',
    gyroscope: 'prompt',
    magnetometer: 'prompt',
    'ambient-light-sensor': 'prompt',
    fullscreen: 'prompt',
  };
  const origQuery = Permissions.prototype.query;
  Permissions.prototype.query = function(desc) {
    const name = typeof desc === 'string' ? desc : (desc && desc.name) || '';
    const state = stateMap[name] || 'prompt';
    return Promise.resolve(Object.setPrototypeOf({ state, onchange: null }, PermissionStatus.prototype));
  };
})();
`;
  fs.writeFileSync(preloadPath, injectionScript + permissionsOverride, 'utf8');

  const partition = `${PARTITION_PREFIX}${profileId}`;
  const ses = session.fromPartition(partition);
  ses.webRequest.onBeforeSendHeaders((details, callback) => {
    const headers = fp!.headers;
    if (headers['user-agent']) details.requestHeaders['User-Agent'] = headers['user-agent'];
    if (headers['accept-language']) details.requestHeaders['Accept-Language'] = headers['accept-language'];
    if (headers['accept']) details.requestHeaders['Accept'] = headers['accept'];
    if (headers['sec-ch-ua']) details.requestHeaders['Sec-CH-UA'] = headers['sec-ch-ua'];
    if (headers['sec-ch-ua-mobile']) details.requestHeaders['Sec-CH-UA-Mobile'] = headers['sec-ch-ua-mobile'];
    if (headers['sec-ch-ua-platform']) details.requestHeaders['Sec-CH-UA-Platform'] = headers['sec-ch-ua-platform'];
    callback({ requestHeaders: details.requestHeaders });
  });

  const config: BrowserConfig = { preloadPath, userAgent: fp.fingerprint.navigator.userAgent };
  configs.set(profileId, config);
  return config;
}

export function openBrowserWindow(parent: BrowserWindow, profileId: string, url?: string): void {
  if (browserWindow) {
    browserWindow.show();
    browserWindow.focus();
    return;
  }

  const config = prepare(profileId);
  const partition = `${PARTITION_PREFIX}${profileId}`;
  const parentBounds = parent.getBounds();

  const width = Math.min(1280, Math.floor(parentBounds.width * 0.85));
  const height = Math.min(800, Math.floor(parentBounds.height * 0.85));
  const x = parentBounds.x + Math.floor((parentBounds.width - width) / 2);
  const y = parentBounds.y + Math.floor((parentBounds.height - height) / 2);

  browserWindow = new BrowserWindow({
    width,
    height,
    x,
    y,
    parent,
    closable: true,
    minimizable: false,
    maximizable: false,
    resizable: true,
    title: '淘宝',
    webPreferences: {
      preload: config.preloadPath,
      partition,
      contextIsolation: false,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  browserWindow.webContents.setUserAgent(config.userAgent);

  browserWindow.webContents.setWindowOpenHandler(({ url: newUrl }) => {
    browserWindow?.loadURL(newUrl);
    return { action: 'deny' };
  });

  browserWindow.on('close', (e) => {
    if (isQuitting) return;
    e.preventDefault();
    browserWindow!.hide();
    flushBrowserSession();
  });

  if (url) {
    browserWindow.loadURL(url);
  }
}

export function closeBrowserWindow(): void {
  if (!browserWindow) return;
  browserWindow.hide();
}
