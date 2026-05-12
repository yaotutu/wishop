# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Wishop is a WeChat store listing assistant desktop application. It supports **multi-account** management — one user can manage multiple WeChat stores, each with independent data (config, logs, scheduler, quota). Account context is resolved at the infrastructure layer; business logic is account-agnostic.

## Commands

```bash
npm run dev          # Run both renderer (vite) and main (electron) in dev mode
npm run dev:renderer # Run renderer only (vite on port 5173)
npm run dev:main     # Compile TypeScript and run electron
npm run build        # Build both renderer and main
npm run build:renderer # Build renderer to dist/renderer
npm run build:main   # Compile main process to dist/main
npm run start        # Run packaged electron app
```

## Architecture — Three-Layer Separation

```
┌─────────────────────────────────────────────┐
│  Infrastructure Layer (account-aware)        │
│  store / handler / scheduler / preload       │
│  Resolves accountId → creates WeChatClient   │
│  + scoped addLog                             │
├─────────────────────────────────────────────┤
│  Business Layer (account-agnostic)           │
│  modules/task-cycle / delete / list / fetch  │
│  Receives api + addLog, pure business logic  │
├─────────────────────────────────────────────┤
│  API Layer (account-agnostic)                │
│  wechat/client.ts — createWeChatClient()     │
│  Factory: per-instance token cache           │
└─────────────────────────────────────────────┘
```

**Key constraint: Business and API layers do NOT import from store. They receive dependencies via parameters.**

### Main Process (src/main/)
- **index.ts** - Electron entry, creates window, registers handlers, starts all schedulers
- **store/index.ts** - Multi-account electron-store: `StoreSchema = { accounts: Account[], activeAccountId }`. All accessors take `accountId` param. Auto-migrates old single-account data.
- **wechat/client.ts** - `createWeChatClient(config)` factory. Each call creates an independent API client with its own token cache. Returns typed `WeChatClient` interface.
- **ipc/handler.ts** - IPC handlers. Creates `WeChatClient` + scoped `addLog` per account, passes to business modules.
- **modules/task-cycle.ts** - Orchestrates task cycle. Receives `api: WeChatClient, addLog: AddLogFn`.
- **modules/fetch-draft-products.ts** - Async generator, receives `api: WeChatClient`.
- **modules/delete-failed-products.ts** - Single product delete, receives `api` + `addLog`.
- **modules/list-unreviewed-products.ts** - Single product list, receives `api` + `addLog`.
- **scheduler/listing-scheduler.ts** - Per-account cron scheduling via `Map<accountId, ScheduledTask>`.

### Preload (src/preload/)
- **index.ts** - Context bridge. All IPC calls take `accountId` as first param. New `accounts` namespace for CRUD.

### Renderer (src/renderer/)
- **App.tsx** - Root component
- **components/Layout.tsx** - Top module tabs (订单管理/店铺管理/商品提审/设置) + left account sidebar (numbered store list, only for account-scoped modules) + content area
- **pages/common-functions/ListingPage.tsx** - Receives `accountId` prop, auto-listing tasks, scheduler, execution logs
- **pages/orders/OrdersPage.tsx** - Receives `accountId` prop, order management (placeholder)
- **pages/store-management/StoreManagement.tsx** - Receives `accountId` prop, store management (placeholder)
- **pages/settings/SettingsPage.tsx** - Global module (no account sidebar), per-account API config
- **hooks/useIpc.ts** - All hooks take `accountId` parameter. `useAccounts()` for account management.

### IPC Channels
| Channel                                             | Direction     | Purpose                                      |
| --------------------------------------------------- | ------------- | -------------------------------------------- |
| accounts:list/add/remove/update/getActive/setActive | renderer→main | Account CRUD                                 |
| config:get/set                                      | renderer→main | Get/set WeChat API credentials (per account) |
| drafts:fetch                                        | renderer→main | Get draft products                           |
| drafts:list                                         | renderer→main | List/publish a product                       |
| quota:get                                           | renderer→main | Get remaining audit quota                    |
| logs:get/clear                                      | renderer→main | Get/clear listing logs                       |
| scheduler:get/set/start/stop                        | renderer→main | Manage scheduled listing                     |
| task:run                                            | renderer→main | Run task cycle                               |
| log:added:{accountId}                               | main→renderer | Real-time log push                           |

## WeChat API Notes

- **Base URL**: `https://api.weixin.qq.com`
- **Auth**: access_token via `cgi-bin/token`
- **Product status** (`status` param in list API): 0=草稿, 5=已上架, 6=回收站, etc.
- **Edit status** (`edit_status` field): 1=编辑中, 2=审核中/可上架, 3=失败, 4=成功, 7=上传中, 8=失败, 72=未审核
- **Listing API** (`/channels/ec/product/listing`): Only works when `edit_status=2`
- **Draft list API** (`/channels/ec/product/list/get`): Response uses `product_ids` field (not `product_id_list`)

## Tech Stack
- Electron 28 + React 18 + TypeScript 5
- Vite (renderer build)
- Ant Design 5.x (UI)
- electron-store (persistence)
- node-cron (scheduling)
- axios (HTTP client)

## Key Files
- `src/main/wechat/client.ts` - WeChat API client factory, token caching per instance
- `src/main/store/index.ts` - Multi-account electron-store schema and access functions
- `src/main/ipc/handler.ts` - Account context resolution, dependency injection
- `src/renderer/hooks/useIpc.ts` - Typed React hooks for IPC calls
- `.claude/skills/wechat-shop-api/` - WeChat API documentation


# 重要规则，改规则由用户手动添加，claude在生成代码时必须遵守并且禁止修改：
- 直接展示原始错误信息 — 不对错误做过度包装或美化，将后端/API返回的原始错误信息直接呈现给用户，保留完整的错误上下文（如状态码、错误码、错误消息）。
- 错误信息要可定位 — 在日志和UI中标注错误发生的位置（如哪个账户、哪个商品、哪一步操作），方便用户自行排查问题。