import { BrowserWindow, WebContentsView, session, app } from 'electron';
import fs from 'fs';
import path from 'path';
import { FingerprintGenerator } from 'fingerprint-generator';
import { FingerprintInjector } from 'fingerprint-injector';
import Store from 'electron-store';
import type { BrowserFingerprintWithHeaders } from 'fingerprint-generator';

const PARTITION_PREFIX = 'persist:taobao-';

interface ViewState {
  view: WebContentsView;
  fp: BrowserFingerprintWithHeaders;
}

const store = new Store<{ fingerprints?: Record<string, BrowserFingerprintWithHeaders> }>();

const generator = new FingerprintGenerator({
  browsers: [{ name: 'chrome', minVersion: 134, maxVersion: 138 }],
  devices: ['desktop'],
  locales: ['zh-CN', 'zh'],
});

const injector = new FingerprintInjector();

let state: ViewState | null = null;

function prepare(profileId: string): ViewState {
  if (state) return state;

  const fingerprints = store.get('fingerprints', {});
  let fp = fingerprints[profileId];
  if (!fp) {
    fp = generator.getFingerprint();
    fingerprints[profileId] = fp;
    store.set('fingerprints', fingerprints);
  }

  const partition = `${PARTITION_PREFIX}${profileId}`;
  const ses = session.fromPartition(partition);

  // 生成反检测 preload 脚本
  const injectionScript = injector.getInjectableScript(fp);
  const dir = path.join(app.getPath('userData'), 'browser-preloads');
  fs.mkdirSync(dir, { recursive: true });
  const preloadPath = path.join(dir, `${profileId}.js`);
  fs.writeFileSync(preloadPath, injectionScript + '\n' + ELECTRON_PATCHES, 'utf8');

  // HTTP header 覆写
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

  const view = new WebContentsView({
    webPreferences: {
      preload: preloadPath,
      partition,
      contextIsolation: false,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  view.webContents.setUserAgent(fp.fingerprint.navigator.userAgent);

  // 拦截新窗口打开，改为当前 View 内导航，避免新窗口丢失登录态
  view.webContents.setWindowOpenHandler(({ url: newUrl }) => {
    view.webContents.loadURL(newUrl);
    return { action: 'deny' };
  });

  state = { view, fp };
  return state;
}

// Electron 专项反检测补丁
const ELECTRON_PATCHES = `
;(function patchElectron() {
  // 删除 Electron 特有属性
  try { delete window.process; } catch(e) {}
  try { delete window.__dirname; } catch(e) {}
  try { delete window.__filename; } catch(e) {}
  try { delete window.exports; } catch(e) {}
  try { delete window.module; } catch(e) {}
  try { delete window.require; } catch(e) {}

  // 确保 navigator.webdriver === false
  try {
    Object.defineProperty(Navigator.prototype, 'webdriver', {
      get: () => false,
      configurable: true,
    });
  } catch(e) {}

  // 补全 window.chrome
  if (!window.chrome || Object.keys(window.chrome).length === 0) {
    window.chrome = {};
  }
  if (!window.chrome.runtime) {
    window.chrome.runtime = {
      connect: function() {},
      sendMessage: function() {},
      onMessage: { addListener: function() {}, removeListener: function() {} },
      id: undefined,
    };
  }
  if (!window.chrome.app) {
    window.chrome.app = {
      isInstalled: false,
      InstallState: { DISABLED: 'disabled', INSTALLED: 'installed', NOT_INSTALLED: 'not_installed' },
      RunningState: { CANNOT_RUN: 'cannot_run', READY_TO_RUN: 'ready_to_run', RUNNING: 'running' },
      getDetails: function() { return null; },
      getIsInstalled: function() { return false; },
    };
  }
  if (!window.chrome.loadTimes) {
    window.chrome.loadTimes = function() {
      return {
        commitLoadTime: performance.timing.responseStart / 1000,
        connectionInfo: 'h2',
        finishDocumentLoadTime: performance.timing.domContentLoadedEventStart / 1000,
        finishLoadTime: performance.timing.loadEventStart / 1000,
        firstPaintAfterLoadTime: 0,
        firstPaintTime: performance.timing.responseStart / 1000,
        navigationType: 'Other',
        npnNegotiatedProtocol: 'h2',
        requestTime: performance.timing.navigationStart / 1000,
        startLoadTime: performance.timing.navigationStart / 1000,
        wasAlternateProtocolAvailable: false,
        wasFetchedViaSpdy: true,
        wasNpnNegotiated: true,
      };
    };
  }
  if (!window.chrome.csi) {
    window.chrome.csi = function() {
      return {
        onloadT: performance.timing.loadEventStart,
        startE: performance.timing.navigationStart,
        pageT: performance.now(),
        tran: 15,
      };
    };
  }

  // 补全 navigator.plugins
  if (navigator.plugins.length === 0) {
    const plugins = [
      { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
      { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '' },
      { name: 'Native Client', filename: 'internal-nacl-plugin', description: '' },
    ];
    const mimeTypes = [
      { type: 'application/x-google-chrome-pdf', suffixes: 'pdf', description: 'Portable Document Format', pluginIndex: 0 },
      { type: 'application/pdf', suffixes: 'pdf', description: '', pluginIndex: 1 },
      { type: 'application/x-nacl', suffixes: '', description: 'Native Client Executable', pluginIndex: 2 },
      { type: 'application/x-pnacl', suffixes: '', description: 'Portable Native Client Executable', pluginIndex: 2 },
    ];

    for (const p of plugins) {
      const plugin = Object.create(Plugin.prototype);
      Object.defineProperties(plugin, {
        name: { value: p.name, enumerable: true },
        filename: { value: p.filename, enumerable: true },
        description: { value: p.description, enumerable: true },
        length: { value: 0, enumerable: true },
      });
      Object.defineProperty(navigator.plugins, navigator.plugins.length, { value: plugin, enumerable: true });
    }
    Object.defineProperty(navigator.plugins, 'length', { value: plugins.length, enumerable: true });

    for (const m of mimeTypes) {
      const mt = Object.create(MimeType.prototype);
      Object.defineProperties(mt, {
        type: { value: m.type, enumerable: true },
        suffixes: { value: m.suffixes, enumerable: true },
        description: { value: m.description, enumerable: true },
        enabledPlugin: { value: navigator.plugins[m.pluginIndex], enumerable: true },
      });
      Object.defineProperty(navigator.mimeTypes, navigator.mimeTypes.length, { value: mt, enumerable: true });
    }
    Object.defineProperty(navigator.mimeTypes, 'length', { value: mimeTypes.length, enumerable: true });
  }

  // 隐藏 permissions query 异常
  const origQuery = Permissions.prototype.query;
  Permissions.prototype.query = function(desc) {
    const name = typeof desc === 'string' ? desc : (desc && desc.name) || '';
    const stateMap = {
      notifications: Notification.permission,
      geolocation: 'prompt',
      camera: 'prompt',
      microphone: 'prompt',
    };
    const state = stateMap[name] || 'prompt';
    return Promise.resolve(Object.setPrototypeOf({ state, onchange: null }, PermissionStatus.prototype));
  };
})();
`;

export function openBrowserView(parent: BrowserWindow, profileId: string, url?: string): void {
  const { view } = prepare(profileId);

  // 转发 URL 和加载状态事件到渲染进程
  const sendUrl = () => parent.webContents.send('browser:url', view.webContents.getURL());
  view.webContents.on('did-navigate', sendUrl);
  view.webContents.on('did-navigate-in-page', sendUrl);
  view.webContents.on('did-start-loading', () => parent.webContents.send('browser:loading', true));
  view.webContents.on('did-stop-loading', () => {
    parent.webContents.send('browser:loading', false);
    sendUrl();
  });

  if (!parent.contentView.children.includes(view)) {
    parent.contentView.addChildView(view);
  }

  if (url) {
    view.webContents.loadURL(url);
  }
}

export function setBrowserBounds(x: number, y: number, width: number, height: number): void {
  if (!state) return;
  state.view.setBounds({ x, y, width, height });
}

export function hideBrowserView(parent: BrowserWindow): void {
  if (!state) return;
  if (parent.contentView.children.includes(state.view)) {
    parent.contentView.removeChildView(state.view);
  }
}

export function navigateBack(): void {
  if (state && state.view.webContents.canGoBack()) {
    state.view.webContents.goBack();
  }
}

export function navigateForward(): void {
  if (state && state.view.webContents.canGoForward()) {
    state.view.webContents.goForward();
  }
}

export function navigateRefresh(): void {
  if (!state) return;
  state.view.webContents.loadURL(state.view.webContents.getURL());
}

export function navigateStop(): void {
  if (!state) return;
  state.view.webContents.stop();
}

export function isBrowserVisible(): boolean {
  return state !== null;
}

export function closeBrowserView(): void {
  if (!state) return;
  state.view.webContents.close();
  state = null;
}

export async function flushBrowserSession(profileId = 'default'): Promise<void> {
  const partition = `${PARTITION_PREFIX}${profileId}`;
  const ses = session.fromPartition(partition);
  ses.flushStorageData();
  await ses.cookies.flushStore();
}
