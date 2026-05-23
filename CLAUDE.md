# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Wishop 是微信小店上架助手桌面应用，支持 **多账户** 管理。账户上下文在基础设施层解析，业务逻辑与账户无关。

## Commands

```bash
npm run dev          # 同时启动 renderer (vite) 和 main (electron)
npm run dev:renderer # 仅启动 renderer (vite, port 5173)
npm run dev:main     # 编译 TypeScript 并启动 electron
npm run build        # 构建 renderer 和 main
npm run build:renderer # 构建 renderer 到 dist/renderer
npm run build:main   # 编译 main process 到 dist/main
npm run start        # 运行打包后的 electron 应用
npm run push         # 版本号 patch + git push --follow-tags
```

修改 TypeScript / Electron / Renderer 代码后，运行 `npm run build` 验证构建通过。

## Architecture

### 三层分离

```
┌─────────────────────────────────────────────┐
│  Infrastructure Layer (account-aware)       │
│  store / ipc handlers / scheduler / preload │
│  Resolves accountId → creates WeChatClient  │
│  + scoped logger                            │
├─────────────────────────────────────────────┤
│  Business Layer (account-agnostic)          │
│  modules/* + services/*                     │
│  Receives api + logger via params           │
├─────────────────────────────────────────────┤
│  API Layer (account-agnostic)               │
│  wxshop/client.ts — factory per-instance    │
│  wxshop/client-registry.ts — client 管理    │
└─────────────────────────────────────────────┘
```

**约束：Business 和 API 层不 import store。依赖通过参数注入。**

### Shared Types (`src/shared/`)

类型按域拆分为独立文件，`types.ts` 作为 barrel re-export：
`accounts.ts`, `orders.ts`, `listing.ts`, `scheduling.ts`, `credentials.ts`, `sync.ts`, `violations.ts`, `license.ts`, `notification.ts`, `global-log.ts`, `errors.ts`, `address-format.ts`, `purchase-status.ts`, `settings.ts`, `cloud-tasks.ts`

### Main Process (`src/main/`)

**Store 层** — Container + Repository 模式：
- `store/container.ts` — 组合根，创建 electron-store 实例和 9 个 Repository
- `store/repositories/` — 每个 Repository 通过闭包注入 getter/setter，不依赖 store 实例，可独立测试
- `store/index.ts` — Facade，平铺导出所有 Repository 方法

**IPC 层** — 按 Domain 分组注册：
- `ipc/handler.ts` — 顶层注册入口
- `ipc/handlers/domains/` — 6 个 domain registrar：`settings-system`, `orders`, `listing`, `violations`, `sync-cloud`, `browser-taobao`
- `ipc/handlers/*.ts` — 29 个独立 handler 文件
- `ipc/utils/session-manager.ts` — 长操作会话管理（AbortController）
- `ipc/utils/log-forwarding.ts` — 实时日志推送到 Renderer

**业务层**：
- `modules/` — 纯业务逻辑（task-cycle, fetch-draft-products, delete-failed-products, list-unreviewed-products, violation-detect），通过参数接收 `api + logger`
- `services/` — 业务服务（cloud-sync-service, order-delivery-service, taobao-automation-service）
- `jobs/job-runner.ts` — 通用任务并发管理器（状态机 + AbortController + 取消）

**调度层**：
- `scheduler/scheduled-job-runner.ts` — 唯一 cron 调度入口，所有定时任务走 `ScheduledJob` + `JobRunner`（支持提审/违规扫描/发货检查三种 job 类型）

**API 层**：
- `wxshop/client.ts` — `createWxShopClient(config)` 工厂，独立 token 缓存
- `wxshop/client-registry.ts` — 客户端注册表，按 accountId 管理 WxShopClient 实例

**其他**：
- `browser/` — 淘宝窗口管理（browser-window, clean-taobao-window, shipping-assistant-window）
- `taobao/` — 页面自动化脚本（page-runtime + *-script.ts）
- `updater.ts` — 基于 electron-updater 的自动更新

### Preload (`src/preload/`)

Context bridge，暴露 `window.wishop`。所有 IPC 调用以 `accountId` 为首参。另有 `window.updater` 用于自动更新。

### Renderer (`src/renderer/`)

**Domain 驱动组织** — `domains/` 下 10 个域，每个域统一 `client.ts`（IPC 封装）+ `hooks.ts`（React Query）：
`accounts`, `orders`, `listing`, `violations`, `scheduled-jobs`, `settings`, `notifications`, `browser`, `cloud`, `system`

**状态管理**：
- `state/` — Zustand store（app-store），仅管理 UI 状态
- `query/client.ts` — TanStack React Query 配置
- `contexts/CredentialErrorContext.tsx` — 凭证错误全局处理

**页面**：
- `components/Layout.tsx` — 主布局，顶部模块标签 + 左侧账户侧边栏 + 内容区。账户模块使用 `display:none/contents` Keep-Alive 策略，切换账户不销毁组件
- `pages/orders/` — 订单管理
- `pages/common-functions/` — 商品提审
- `pages/violation/` — 违规词检测
- `pages/store-management/` — 店铺管理
- `pages/scheduled-jobs/` — 调度任务管理
- `pages/settings/` — 全局设置

## Browser And Taobao Rules

淘宝窗口策略是刻意设计的，不得随意更改。

- 淘宝页面必须通过 `src/main/browser/browser-window.ts` 打开
- 淘宝窗口使用持久化 partition `persist:taobao-clean-${profileId}` 的干净 BrowserWindow
- **禁止**添加浏览器指纹伪装
- **禁止**添加 `fingerprint-generator`, `fingerprint-injector` 或类似依赖
- **禁止**修改 `navigator`, `webdriver`, canvas, WebGL, permissions, plugins, languages 或其他指纹表面
- **禁止**设置自定义 User-Agent 或 client hints
- **禁止**改写 `User-Agent`, `Accept-Language`, `Sec-CH-UA`, `Accept` 等请求头
- **禁止**添加 `disable-blink-features=AutomationControlled`
- **禁止**为淘宝页面添加用于隐蔽/指纹/补丁的 preload 脚本
- `browser:open` 是兼容别名，必须继续打开干净的淘宝窗口
- 用户登录状态预期在干净 partition 中持久化，关闭淘宝窗口只是隐藏（除非 app 正在退出）

淘宝业务自动化**仅允许**用户显式触发的操作：
- 检查关联的淘宝采购订单发货状态
- 准备/提交淘宝退款页面
- 从解码的微信订单地址填充结账地址

检测到淘宝登录验证、滑块、验证码、访问拒绝页面或其他验证挑战时，自动化**必须停止并暴露原始错误**。禁止实现隐藏重试或反风控绕过逻辑。

### 当前淘宝自动化入口

- 主服务：`src/main/services/taobao-automation-service.ts`
- IPC handler：`src/main/ipc/handlers/taobaoAutomation.ts`
- Preload API：`window.wishop.taobaoAutomation`
- UI 入口：
  - 订单管理 — 采购列：检查发货状态
  - 订单管理 — 退款流程：准备退款原因并可选提交
  - 发货助手：填充当前淘宝结账地址

自动化必须保持**显式、稀疏、用户可见**。除非用户明确要求且有风险文档，不得运行后台淘宝 DOM 自动化。

## WeChat API Notes

- **Base URL**: `https://api.weixin.qq.com`
- **Auth**: access_token via `cgi-bin/token`
- **Product status** (`status` param in list API): 0=草稿, 5=已上架, 6=回收站, etc.
- **Edit status** (`edit_status` field): 1=编辑中, 2=审核中, 3=审核失败, 4=成功, 7=上传中, 8=上传失败, 72=未审核。处理方式通过 `statusRules` 全局配置（默认：1/72→提审, 3→删除, 其他→跳过）
- **Listing API** (`/channels/ec/product/listing`): Only works when `edit_status=2`
- **Draft list API** (`/channels/ec/product/list/get`): Response uses `product_ids` field (not `product_id_list`)
- **Order status** (`OrderStatus` enum): 10=待付款, 12=待接受赠品, 13=拼团, 20=待发货, 21=部分发货, 30=待收货, 100=已完成, 200=售后取消, 250=用户取消

## Tech Stack

- Electron 42 + React 19 + TypeScript 6
- Vite 8 (renderer build)
- Ant Design 6.x (UI)
- Zustand 5 (renderer UI state)
- TanStack React Query 5 (renderer data fetching)
- electron-store 11 (persistence, Container + Repository 模式)
- electron-log 5.x (logging)
- electron-updater 6.x (auto-update)
- node-cron 4 (scheduling)
- axios (HTTP client)
- vitest (testing)

## Important Rules

以下规则由用户手动添加，生成代码时必须遵守，禁止修改：

- **直接展示原始错误信息** — 不对错误做过度包装或美化，将后端/API 返回的原始错误信息直接呈现给用户，保留完整的错误上下文（如状态码、错误码、错误消息）。
- **错误信息要可定位** — 在日志和 UI 中标注错误发生的位置（如哪个账户、哪个商品、哪一步操作），方便用户自行排查问题。

## Logging Rules

主进程（`src/main/`）使用 `electron-log`，通过 `createLogger()` 创建 scoped logger。禁止直接使用 `console.log/warn/error`。

```typescript
import { createLogger } from '../utils/logger';
const logger = createLogger('模块名', accountId);
logger.info('普通信息');
logger.warn('警告');
logger.error('错误描述', error);  // error 对象必须作为第二参数
```

1. **统一用 `createLogger`** — 不允许裸 `console.*`，新模块必须在函数开头创建 logger
2. **标签格式 `[模块名:accountId]`** — `createLogger('模块名', accountId)` 自动生成，无 accountId 的场景用 `'system'`
3. **error 必须传完整对象** — `logger.error('描述', error)`，不要传 `error.message`，保留堆栈信息
4. **禁止静默吞错误** — `catch {}`、`.catch(() => {})`、`on('error', () => {})` 均不允许，必须有 `logger.error`
5. **日志自动写文件** — 日志写入 `userData/logs/main.log`（5MB 轮转），无需手动处理

## Git Hygiene

- 不得随意 revert 用户更改，除非明确要求
- 保持更改范围限定在请求的迁移或 bug 修复内
- 不要重新引入已移除的测试专用淘宝验证页面，除非明确要求
