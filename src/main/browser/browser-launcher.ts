/**
 * CloakBrowser 启动脚本
 * 通过 child_process.fork() 启动，不依赖 Electron 运行时。
 * 通信协议：
 *   收到 { type: 'launch', url, x, y, width, height, userDataDir } → 启动浏览器（单例）
 *   收到 { type: 'search', keyword } → 跳转淘宝首页，输入关键词并搜索
 *   收到 { type: 'close' } → 优雅关闭浏览器（保存数据后退出）
 *   发送 { type: 'ready' } → 浏览器启动完成
 *   发送 { type: 'done', message } → 搜索操作完成
 *   发送 { type: 'closed' } → 浏览器已关闭
 */

// 禁止 CloakBrowser 自动检查更新和下载新版本
process.env.CLOAKBROWSER_AUTO_UPDATE = 'false';

let activePage: import('playwright-core').Page | null = null;
let browserContext: import('playwright-core').BrowserContext | null = null;
let messageQueue: Promise<void> = Promise.resolve();

function queueMessage(fn: () => Promise<void>): void {
  messageQueue = messageQueue.then(fn).catch((err) => {
    console.error('CloakBrowser error:', err);
    process.send?.({ type: 'error', message: String(err) });
  });
}

async function handleLaunch(msg: {
  url: string;
  x: number;
  y: number;
  width: number;
  height: number;
  userDataDir: string;
}): Promise<void> {
  const { launchPersistentContext } = await import('cloakbrowser');

  browserContext = await launchPersistentContext({
    userDataDir: msg.userDataDir,
    headless: false,
    humanize: true,
    args: [
      `--window-position=${msg.x},${msg.y}`,
      `--window-size=${msg.width},${msg.height}`,
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-sandbox',
    ],
    viewport: { width: msg.width, height: msg.height },
  });

  const pages = browserContext.pages();
  activePage = pages.length > 0 ? pages[0] : await browserContext.newPage();
  await activePage.goto(msg.url, { waitUntil: 'domcontentloaded' });

  // 用户点击窗口 X 关闭时，不要 process.exit()，
  // 让 Chromium 自己完成数据刷盘后再自然退出
  browserContext.on('close', () => {
    browserContext = null;
    activePage = null;
    process.send?.({ type: 'closed' });
    // 不调用 process.exit()，让 Node 进程自然退出
    // Playwright 内部会等 Chromium 子进程结束
  });

  process.send?.({ type: 'ready' });
}

// 淘宝首页常见的弹窗关闭按钮选择器
const POPUP_CLOSE_SELECTORS = [
  '.J_Close',
  '.close',
  '[class*="modal"] [class*="close"]',
  '[class*="dialog"] [class*="close"]',
  '[class*="popup"] [class*="close"]',
  '.tb-close',
  '.J_DIALOG_CLOSE',
  'i.icon-close',
  '.icon-close',
  'div[title="关闭"]',
  '.btn-close',
  '.login-close',
  '.J_LOGIN_CLOSE',
  '#J_LoginClose',
];

async function dismissPopups(page: import('playwright-core').Page): Promise<void> {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  for (const selector of POPUP_CLOSE_SELECTORS) {
    try {
      const btns = await page.$$(selector);
      for (const btn of btns) {
        if (await btn.isVisible()) {
          await btn.click().catch(() => {});
          await page.waitForTimeout(300);
        }
      }
    } catch {
      // 选择器不匹配，跳过
    }
  }
}

async function handleSearch(msg: { keyword: string }): Promise<void> {
  if (!activePage || activePage.isClosed()) return;

  const keyword = msg.keyword?.trim();
  if (!keyword) {
    process.send?.({ type: 'done', message: '已打开淘宝首页' });
    return;
  }

  await activePage.goto('https://www.taobao.com', { waitUntil: 'domcontentloaded' });
  await activePage.waitForTimeout(2000);
  await dismissPopups(activePage);

  const searchInput = await activePage.waitForSelector('#q', { timeout: 10000 }).catch(() => null);
  if (!searchInput) {
    await dismissPopups(activePage);
    const retry = await activePage.waitForSelector('#q', { timeout: 10000 }).catch(() => null);
    if (!retry) {
      process.send?.({ type: 'error', message: '未找到淘宝搜索框，请检查页面是否正常加载' });
      return;
    }
  }

  const input = searchInput!;
  await input.click();
  await activePage.keyboard.press('Control+a');
  await activePage.keyboard.type(msg.keyword, { delay: 120 });

  const searchBtn = await activePage.$('button.btn-search');
  if (searchBtn) {
    await searchBtn.click();
  } else {
    await activePage.keyboard.press('Enter');
  }

  process.send?.({ type: 'done', message: `已搜索: ${keyword}` });
}

async function handleClose(): Promise<void> {
  if (browserContext) {
    await browserContext.close();
  }
}

process.on('message', (msg: { type: string; [key: string]: any }) => {
  if (msg.type === 'launch') {
    queueMessage(() => handleLaunch(msg as any));
  } else if (msg.type === 'search') {
    queueMessage(() => handleSearch(msg as any));
  } else if (msg.type === 'close') {
    queueMessage(() => handleClose());
  }
});

process.on('unhandledRejection', (err) => {
  console.error('CloakBrowser unhandled rejection:', err);
  process.send?.({ type: 'error', message: String(err) });
});
