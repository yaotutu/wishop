import { BrowserWindow, app } from 'electron';
import { fork, ChildProcess } from 'child_process';
import path from 'path';

type BrowserMessage = { type: string; message?: string };

let childProcess: ChildProcess | null = null;
let browserReady = false;
let readyResolve: (() => void) | null = null;
let doneResolve: ((message: string) => void) | null = null;

function getUserDataDir(profileId: string): string {
  return path.join(app.getPath('userData'), 'browser-data', profileId);
}

function getLauncherPath(): string {
  return path.join(__dirname, 'browser-launcher.js');
}

function resetState(): void {
  childProcess = null;
  browserReady = false;
  readyResolve = null;
  doneResolve = null;
}

function waitReady(): Promise<void> {
  return new Promise((resolve) => {
    if (browserReady) { resolve(); return; }
    readyResolve = resolve;
  });
}

function waitDone(): Promise<string> {
  return new Promise((resolve) => {
    doneResolve = resolve;
  });
}

function ensureProcess(): void {
  if (childProcess && !childProcess.killed) return;

  childProcess = fork(getLauncherPath(), [], { execPath: 'node' });

  childProcess.on('message', (msg: BrowserMessage) => {
    switch (msg.type) {
      case 'ready':
        browserReady = true;
        if (readyResolve) { readyResolve(); readyResolve = null; }
        break;
      case 'done':
        if (doneResolve) { doneResolve(msg.message || '操作完成'); doneResolve = null; }
        break;
      case 'closed':
      case 'error':
        if (doneResolve) { doneResolve(msg.message || '浏览器异常'); doneResolve = null; }
        resetState();
        break;
    }
  });

  childProcess.on('exit', () => {
    if (doneResolve) { doneResolve('浏览器已退出'); doneResolve = null; }
    resetState();
  });
}

export async function openBrowserWindow(
  parent: BrowserWindow,
  profileId: string,
  url?: string,
  keyword?: string,
): Promise<string> {
  const bounds = parent.getBounds();
  const width = Math.min(1280, Math.floor(bounds.width * 0.85));
  const height = Math.min(800, Math.floor(bounds.height * 0.85));
  const x = bounds.x + Math.floor((bounds.width - width) / 2);
  const y = bounds.y + Math.floor((bounds.height - height) / 2);

  ensureProcess();

  if (!browserReady) {
    childProcess!.send({
      type: 'launch',
      url: url || 'https://www.taobao.com',
      x,
      y,
      width,
      height,
      userDataDir: getUserDataDir(profileId),
    });
    await waitReady();
  }

  if (browserReady && childProcess && !childProcess.killed) {
    childProcess.send({ type: 'search', keyword: keyword || '' });
    return waitDone();
  }

  return '浏览器启动失败';
}

export function closeBrowserWindow(): void {
  if (childProcess && !childProcess.killed) {
    const proc = childProcess;
    resetState();
    proc.send({ type: 'close' });
    // 100s 兜底，正常情况下浏览器会自己优雅关闭
    setTimeout(() => {
      if (!proc.killed) proc.kill();
    }, 100_000);
  }
}

export async function flushBrowserSession(): Promise<void> {}

export function setBrowserQuitting(_v: boolean): void {
  closeBrowserWindow();
}
