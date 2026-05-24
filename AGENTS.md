# AGENTS.md

This file documents repository-specific rules for coding agents working on Wishop.

## Project

Wishop is an Electron desktop app for WeChat Shop operations. The app supports multiple shop accounts. Account-aware infrastructure resolves `accountId`, while business modules should stay account-agnostic where practical.

## Commands

```bash
npm run dev
npm run build
npm run build:renderer
npm run build:main
npm run start
```

Run `npm run build` before handing off changes that touch TypeScript, Electron main/preload, or renderer code.


## Current Taobao Automation Surface

- Main service: `src/main/services/taobao-automation-service.ts`
- IPC handler: `src/main/ipc/handlers/taobaoAutomation.ts`
- Preload API: `window.wishop.taobaoAutomation`
- UI entry points:
  - `订单管理` purchase column: check shipment status
  - `订单管理` refund flow: prepare refund reason and optionally submit
  - `发货助手`: fill current Taobao checkout address

Keep this automation explicit, sparse, and user visible. Do not run background Taobao DOM automation without a visible user workflow unless the user asks for that product behavior and risk is documented.

## Architecture Notes

- Main IPC handlers live in `src/main/ipc/handlers/*`.
- Shared types live in `src/shared/types.ts`.
- Renderer client/hooks live in `src/renderer/domains/*`.
- Browser-window management belongs in `src/main/browser/browser-window.ts`.
- WeChat API access belongs in `src/main/wxshop/client.ts` and `src/main/wxshop/client-registry.ts`.
- Store access belongs in `src/main/store/index.ts`; avoid importing store from account-agnostic business modules.

## Logging And Errors

- Main process code should use `createLogger()` from `src/main/utils/logger.ts`.
- Do not use bare `console.*` in main-process code.
- Preserve raw backend/API errors where possible. UI messages should identify the operation/account/order/product involved.
- Do not silently swallow errors in `catch {}` blocks.

## Git Hygiene

- Do not revert user changes unless explicitly asked.
- Keep changes scoped to the requested migration or bug fix.
- Do not reintroduce removed test-only Taobao verification pages unless explicitly requested.
