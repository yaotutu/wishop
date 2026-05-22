# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Wishop 是微信小店上架助手桌面应用，支持 **多账户** 管理 — 一个用户管理多个微信小店，每个店铺独立数据（配置、日志、调度、违规词）。账户上下文在基础设施层解析，业务逻辑与账户无关。

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

## Architecture — Three-Layer Separation

```
┌─────────────────────────────────────────────┐
│  Infrastructure Layer (account-aware)        │
│  store / handlers / scheduler / preload      │
│  Resolves accountId → creates WeChatClient   │
│  + scoped logger                             │
├─────────────────────────────────────────────┤
│  Business Layer (account-agnostic)           │
│  modules/* — receives api + logger           │
│  Pure business logic, no store import        │
├─────────────────────────────────────────────┤
│  API Layer (account-agnostic)                │
│  wxshop/client.ts — createWeChatClient()     │
│  Factory: per-instance token cache           │
│  wxshop/client-registry.ts — client 管理     │
└─────────────────────────────────────────────┘
```

**Key constraint: Business 和 API 层不 import store。依赖通过参数注入。**

### Shared Types (`src/shared/types.ts`)
所有层共享的类型定义：`Config`, `Account`, `FullAccount`, `ScheduledTask`, `TaskConfig`, `LogEntry`, `DraftProduct`, `QuotaResult`, `TaskCycleResult`, `Order*`, `ViolationMatch`, `ViolationScanResult`, `AddLogFn`, `OrderStatus` (enum), `BlacklistRule`, `StatusAction`, `StatusRule`。

### Main Process (`src/main/`)
- **index.ts** - Electron 入口，创建窗口，注册 IPC handlers，启动调度器，管理 auto-updater
- **store/index.ts** - 多账户 electron-store，`StoreSchema = { accounts: FullAccount[], activeAccountId }`
- **wxshop/client.ts** - `createWeChatClient(config)` 工厂，每次创建独立的 API 客户端和 token 缓存
- **wxshop/client-registry.ts** - WeChat 客户端注册表，管理多账户客户端实例
- **ipc/handler.ts** - IPC handler 注册入口，分发到各子 handler
- **ipc/handlers/** - 按 domain 拆分的 handler 文件：
  - `accounts.ts` - 账户 CRUD
  - `config.ts` - API 配置管理
  - `drafts.ts` - 草稿商品操作
  - `orders.ts` - 订单管理（列表、详情、搜索、地址解码）
  - `quota.ts` - 审核额度查询
  - `logs.ts` - 日志管理
  - `scheduler.ts` - 调度任务管理
  - `task.ts` - 任务执行控制（运行、批量删除、停止）
  - `blacklistRules.ts` - 停止黑名单规则管理
  - `skipCodeRules.ts` - 保留关键词管理
  - `statusRules.ts` - 处理规则管理（editStatus → action 映射）
  - `violation.ts` - 违规词检测
  - `browser.ts` - 浏览器窗口控制
- **ipc/utils/** - `log-forwarding.ts`（日志转发）、`session-manager.ts`（会话管理）
- **modules/** - 业务逻辑模块：
  - `task-cycle.ts` - 任务周期编排，接收 `api: WeChatClient, addLog: AddLogFn, statusRules: StatusRule[]`。通过 statusRules 查表决定每个 editStatus 的处理方式（submit/delete/skip）
  - `fetch-draft-products.ts` - 异步生成器，接收 `api: WeChatClient`
  - `delete-failed-products.ts` - 删除失败商品，接收 `api` + `addLog`
  - `list-unreviewed-products.ts` - 列出待审商品，接收 `api` + `addLog`
  - `violation-detect.ts` - 违规词扫描，接收 `api` + `addLog`
- **scheduler/listing-scheduler.ts** - 每账户 cron 调度，`Map<accountId, ScheduledTask>`
- **browser/browser-window.ts** - 淘宝干净浏览器窗口管理；不做 UA/请求头/指纹伪装
- **updater.ts** - 基于 electron-updater 的自动更新

### Preload (`src/preload/`)
- **index.ts** - Context bridge，所有 IPC 调用以 `accountId` 为首参。暴露 `window.electronAPI` 和 `window.updater`。

### Renderer (`src/renderer/`)
- **App.tsx** - 根组件
- **components/Layout.tsx** - 顶部模块标签（订单管理/店铺管理/商品提审/违规词检测/设置）+ 左侧账户侧边栏 + 内容区。`BrowserContext` 提供浏览器控制。账户模块使用 `display:none/contents` 策略保持所有账户页面组件实例，切换账户不销毁组件。
- **components/AccountModals.tsx** - 账户添加/编辑/删除弹窗
- **components/StatCard.tsx** - 统计卡片组件
- **pages/** - 页面组件：
  - `orders/OrdersPage.tsx` - 订单管理（列表、搜索、详情、地址解码），React.memo 包裹
  - `store-management/StoreManagement.tsx` - 店铺管理（占位）
  - `common-functions/ListingPage.tsx` - 商品提审，含调度器和执行日志，React.memo 包裹
  - `violation/ViolationPage.tsx` - 违规词检测管理，React.memo 包裹
  - `settings/SettingsPage.tsx` - 全局设置，每账户 API 配置
- **hooks/** - 按 domain 拆分的 React hooks：
  - `useIpc.ts` - 基础 IPC hook
  - `useIpcFetch.ts` - IPC fetch 工具
  - `useAccounts.ts` - 账户管理
  - `useConfig.ts` - 配置管理
  - `useDrafts.ts` - 草稿商品
  - `useOrders.ts` - 订单管理
  - `useQuota.ts` - 额度查询
  - `useLogs.ts` - 日志管理
  - `useScheduler.ts` - 调度管理
  - `useTaskConfig.ts` - 任务配置
  - `useBlacklistRules.ts` - 停止黑名单规则
  - `useSkipKeywords.ts` - 保留关键词
  - `useStatusRules.ts` - 处理规则（editStatus → action 映射）
  - `useBrowser.ts` - 浏览器控制

### IPC Channels
| Channel                                             | Direction     | Purpose                                      |
| --------------------------------------------------- | ------------- | -------------------------------------------- |
| accounts:list/add/remove/update/getActive/setActive | renderer→main | Account CRUD                                 |
| config:get/set                                      | renderer→main | WeChat API 配置（每账户）                    |
| drafts:fetch                                        | renderer→main | 获取草稿商品                                 |
| drafts:list                                         | renderer→main | 列出/发布商品                                |
| orders:list/detail/search/decodeAddress             | renderer→main | 订单管理                                     |
| quota:get                                           | renderer→main | 查询审核额度                                 |
| logs:get/clear                                      | renderer→main | 获取/清除日志                                |
| scheduler:list/add/update/remove                    | renderer→main | 调度任务管理                                 |
| taskConfig:get/set                                  | renderer→main | 任务配置管理                                 |
| task:run/batchDelete/stop                           | renderer→main | 任务执行控制                                 |
| blacklistRules:get/set                              | renderer→main | 停止黑名单规则管理                           |
| skipKeywords:get/set                                | renderer→main | 保留关键词管理                               |
| statusRules:get/set/reset                           | renderer→main | 处理规则管理（editStatus→action映射）        |
| violation:getWords/setWords/batchScan/scanStep/batchDelete/stop | renderer→main | 违规词检测                       |
| browser:open/openClean/close                        | renderer→main | 干净淘宝浏览器窗口控制                       |
| taobaoAutomation:lookupPurchase/prepareRefund/fillCheckoutAddress | renderer→main | 用户显式触发的淘宝业务自动化       |
| app:version                                         | renderer→main | 获取应用版本                                 |
| update:install                                      | renderer→main | 安装更新                                     |
| log:added:{accountId}                               | main→renderer | 实时日志推送                                 |
| violation:log:{accountId}                           | main→renderer | 违规词扫描日志推送                           |

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
- electron-store 11 (persistence)
- electron-log 5.x (logging)
- electron-updater 6.x (auto-update)
- node-cron 4 (scheduling)
- axios (HTTP client)
- 淘宝窗口不使用 fingerprint-generator/injector，不做浏览器指纹伪装

## Key Files
- `src/shared/types.ts` - 所有层共享的 TypeScript 类型定义
- `src/main/utils/logger.ts` - `createLogger(module, accountId)` 封装
- `src/main/wxshop/client.ts` - WeChat API client factory, token caching
- `src/main/wxshop/client-registry.ts` - 客户端注册表
- `src/main/store/index.ts` - Multi-account electron-store
- `src/main/ipc/handler.ts` - IPC handler 注册入口
- `src/main/ipc/handlers/*.ts` - 按 domain 拆分的 handler
- `src/main/browser/browser-window.ts` - 干净淘宝窗口；禁止 UA/请求头/指纹伪装
- `src/main/updater.ts` - 自动更新逻辑
- `src/renderer/hooks/*.ts` - 按 domain 拆分的 React hooks
- `src/renderer/components/Layout.tsx` - 主布局 + 路由（display:none/contents 账户切换策略）


# 重要规则，改规则由用户手动添加，claude在生成代码时必须遵守并且禁止修改：
- 直接展示原始错误信息 — 不对错误做过度包装或美化，将后端/API返回的原始错误信息直接呈现给用户，保留完整的错误上下文（如状态码、错误码、错误消息）。
- 错误信息要可定位 — 在日志和UI中标注错误发生的位置（如哪个账户、哪个商品、哪一步操作），方便用户自行排查问题。

## 日志规范

主进程（`src/main/`）使用 `electron-log`，通过 `createLogger()` 创建 scoped logger。禁止直接使用 `console.log/warn/error`。

```typescript
import { createLogger } from '../utils/logger';
const logger = createLogger('模块名', accountId);
logger.info('普通信息');
logger.warn('警告');
logger.error('错误描述', error);  // error 对象必须作为第二参数
```

规则：
1. **统一用 `createLogger`** — 不允许裸 `console.*`，新模块必须在函数开头创建 logger
2. **标签格式 `[模块名:accountId]`** — `createLogger('模块名', accountId)` 自动生成，无 accountId 的场景用 `'system'`
3. **error 必须传完整对象** — `logger.error('描述', error)`，不要传 `error.message`，保留堆栈信息
4. **禁止静默吞错误** — `catch {}`、`.catch(() => {})`、`on('error', () => {})` 均不允许，必须有 `logger.error`
5. **日志自动写文件** — 日志写入 `userData/logs/main.log`（5MB 轮转），无需手动处理
