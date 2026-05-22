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

## Browser And Taobao Rules

The Taobao browser strategy is intentional and must not be changed casually.

- Taobao pages must open through `src/main/browser/browser-window.ts`.
- The Taobao window is a clean Electron `BrowserWindow` using persistent partitions named `persist:taobao-clean-${profileId}`.
- Do not add browser fingerprint spoofing.
- Do not add `fingerprint-generator`, `fingerprint-injector`, or similar dependencies.
- Do not change `navigator`, `webdriver`, canvas, WebGL, permissions, plugins, languages, or other browser fingerprint surfaces.
- Do not set custom User-Agent or client hints.
- Do not rewrite request headers such as `User-Agent`, `Accept-Language`, `Sec-CH-UA`, or `Accept`.
- Do not add `disable-blink-features=AutomationControlled`.
- Do not add preload scripts to Taobao pages for stealth, fingerprinting, or page patching.
- `browser:open` is a compatibility alias and must continue to open the clean Taobao window.
- User login state is expected to persist in the clean partition. Closing the Taobao window hides it unless the app is quitting.

Taobao business automation is allowed only as explicit user-triggered operations, for example:

- checking a linked Taobao purchase order's shipment status;
- preparing/refund-submitting a Taobao refund page;
- filling a checkout address from a decoded WeChat order address.

Automation must stop and surface the raw error when a Taobao login, slider, captcha, access-denied page, or other verification challenge is detected. Do not implement hidden retries or anti-risk-control bypass logic.

## Current Taobao Automation Surface

- Main service: `src/main/services/taobao-automation-service.ts`
- IPC handler: `src/main/ipc/handlers/taobaoAutomation.ts`
- Preload API: `window.electronAPI.taobaoAutomation`
- UI entry points:
  - `订单管理` purchase column: check shipment status
  - `订单管理` refund flow: prepare refund reason and optionally submit
  - `发货助手`: fill current Taobao checkout address

Keep this automation explicit, sparse, and user visible. Do not run background Taobao DOM automation without a visible user workflow unless the user asks for that product behavior and risk is documented.

## Architecture Notes

- Main IPC handlers live in `src/main/ipc/handlers/*`.
- Shared types live in `src/shared/types.ts`.
- Renderer hooks live in `src/renderer/hooks/*`.
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
