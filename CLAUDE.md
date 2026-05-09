# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Wishop is a WeChat store listing assistant desktop application. It helps merchants automate product publishing to WeChat stores (微信小店) from draft products, with support for scheduled listing and quota management.

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

## Architecture

### Main Process (src/main/)
- **index.ts** - Electron main entry, creates BrowserWindow, registers IPC handlers, initializes scheduler
- **ipc/handler.ts** - IPC handlers for config, drafts, quota, logs, scheduler
- **ipc/wechat-api.ts** - WeChat Store API calls (access_token, product list/detail, listing, quota)
- **scheduler/listing-scheduler.ts** - node-cron based scheduled listing
- **store/index.ts** - electron-store for persistent config, scheduler state, and logs

### Preload (src/preload/)
- **index.ts** - Context bridge exposing electronAPI to renderer (config, drafts, quota, logs, scheduler IPC)

### Renderer (src/renderer/)
- **App.tsx** - Root component rendering Layout
- **components/Layout.tsx** - Sidebar navigation with tabs: 上架, 订单管理, 设置
- **pages/Listing.tsx** - Draft products list with listing action
- **pages/Orders.tsx** - Order management (placeholder)
- **pages/Settings.tsx** - AppId/AppSecret config
- **hooks/useIpc.ts** - React hooks wrapping electronAPI calls

### IPC Channels
| Channel | Direction | Purpose |
|---------|-----------|---------|
| config:get/set | renderer→main | Get/set WeChat API credentials |
| drafts:fetch | renderer→main | Get draft products |
| drafts:list | renderer→main | List/publish a product |
| quota:get | renderer→main | Get remaining audit quota |
| logs:get/clear | renderer→main | Get/clear listing logs |
| scheduler:get/set/start/stop | renderer→main | Manage scheduled listing |

## WeChat API Notes

- **Base URL**: `https://api.weixin.qq.com`
- **Auth**: access_token via `cgi-bin/token`
- **Product status** (`status` param in list API): 0=草稿, 5=已上架, 6=回收站, etc.
- **Edit status** (`edit_status` field): 1=编辑中, 2=审核中/可上架, 3=失败, 4=成功, 7=上传中, 8=失败
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
- `src/main/ipc/wechat-api.ts` - All WeChat API calls, token caching
- `src/main/store/index.ts` - electron-store schema and access functions
- `src/renderer/hooks/useIpc.ts` - Typed React hooks for IPC calls
- `.claude/skills/wechat-shop-api/` - WeChat API documentation
