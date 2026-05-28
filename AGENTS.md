# 仓库协作指南

## 项目概览

微店管家（Wishop）是一个 Electron 桌面应用，用于帮助商户管理微信小店，包含多账户管理、订单管理、店铺管理、商品提审、违规词检测、调度任务和自动更新等能力。

项目使用 Electron、React、TypeScript、Vite 和 Ant Design。账户上下文在基础设施层解析，业务逻辑应保持与账户无关，通过参数注入所需依赖。

## 文档与技能规则

涉及库、框架、SDK、API、CLI 工具或云服务的用法、配置、迁移、调试、版本差异和最佳实践时，必须先用 Context7 MCP 查询当前文档，即使是 React、Electron、Ant Design、Vite、TypeScript 等常见技术也不能只凭记忆实现。

Context7 使用流程：

1. 先用 `resolve-library-id` 按库名和当前问题解析库 ID，除非用户已经给出 `/org/project` 格式的精确 ID。
2. 按名称匹配、描述相关性、代码片段数量、来源声誉和分数选择最合适的结果；用户指定版本时使用版本化 ID。
3. 再用 `query-docs` 查询完整问题，并基于查询结果回答或实现。

不需要使用 Context7 的场景：重构本项目代码、编写普通脚本、调试业务逻辑、代码审查、解释通用编程概念。

涉及 Electron 的改动必须先使用本仓库的 `electron` skill；涉及 Ant Design 的改动必须先使用本仓库的 `ant-design` skill。不要凭旧 API 记忆直接写代码。

## 常用命令

```bash
npm run dev            # 同时启动 renderer 和 Electron main
npm run dev:renderer   # 仅启动 Vite renderer
npm run dev:main       # 编译 main process 并启动 Electron
npm run build          # 构建 renderer 和 main
npm run build:renderer # 构建 renderer 到 dist/renderer
npm run build:main     # 编译 main process 到 dist/main
npm run start          # 运行打包后的 Electron 应用
npm run push           # patch 版本号并 git push --follow-tags
```

改动后至少运行与改动范围匹配的校验。纯 main process 改动运行 `npm run build:main`；纯 renderer 改动运行 `npm run build:renderer`；跨进程、共享类型、构建配置或不确定范围的改动运行 `npm run build`。

## 架构边界

项目分为三层：

1. Infrastructure layer：`src/main/store`、IPC handlers、scheduler、preload 等，负责解析 `accountId`、创建微信客户端和 scoped logger。
2. Business layer：`src/main/modules/*`，只接收 `api`、`logger`、`addLog`、规则配置等参数，不直接读取 store。
3. API layer：`src/main/wxshop/*`，通过 `createWeChatClient(config)` 创建每账户独立客户端和 token 缓存。

关键约束：Business 层和 API 层不得 import store。账户、配置、日志和规则都应由调用方注入。

## 关键目录

- `src/main/index.ts`：Electron 入口，窗口创建、IPC 注册、调度器、自动更新。
- `src/main/ipc/handler.ts`：IPC 注册入口。
- `src/main/ipc/handlers/`：按业务域拆分的 IPC handler。
- `src/main/modules/`：业务流程模块，例如商品提审、删除失败商品、违规词扫描。
- `src/main/wxshop/client.ts`：微信小店 API client factory。
- `src/main/store/index.ts`：多账户 electron-store。
- `src/main/scheduler/`：每账户 cron 调度。
- `src/preload/index.ts`：Context bridge，暴露 `window.electronAPI`、`window.appVersion` 和 `window.updater`。
- `src/renderer/`：React 前端页面、组件、hooks 和 contexts。
- `src/shared/`：跨 main/preload/renderer 共享类型和错误工具。

## IPC 规则

Preload 暴露的 IPC 调用以 `accountId` 为首参。新增 IPC 时应同步维护：

- shared 类型或错误约定；
- main process handler；
- preload bridge；
- renderer hook 或调用封装；
- 错误展示与日志上下文。

凭证类错误由 main process 抛出带 `[CREDENTIAL]` 前缀的 Error，renderer 通过 `CredentialErrorContext` 统一拦截并引导用户去店铺管理页配置。

## 错误与日志规则

用户手动添加的高优先级规则必须遵守：

- 直接展示原始错误信息，不对后端或 API 返回错误做过度包装或美化。
- 错误信息必须可定位，在日志和 UI 中标注账户、商品、操作步骤等上下文。
- 不要吞错误。`catch {}`、`.catch(() => {})`、`on('error', () => {})` 都不允许。

主进程使用 `electron-log`，必须通过 `createLogger()` 创建 scoped logger，禁止直接使用 `console.log`、`console.warn`、`console.error`。

```ts
import { createLogger } from '../utils/logger';

const logger = createLogger('模块名', accountId);
logger.info('普通信息');
logger.warn('警告');
logger.error('错误描述', error);
```

日志要求：

- `createLogger('模块名', accountId)` 自动生成 `[模块名:accountId]` 标签；没有账户上下文时使用 `'system'`。
- `logger.error()` 的第二个参数必须传完整 error 对象，不要只传 `error.message`。
- 日志写入 `userData/logs/main.log`，无需业务代码手动管理文件。

## 安全规则

不要提交真实 app 凭证、access token、appSecret、客户数据、真实地址、手机号或订单敏感明细。

微信 access token 和 appSecret 不得进入日志、通知、错误详情、UI 展示或云端分析。需要业务隔离 key 时使用 `accountId`，不要使用 appId 或 token。

## 前端规则

Renderer 使用 React 函数组件和 hooks。优先复用现有 hooks、contexts、页面结构和 Ant Design 模式。

账户切换依赖 `Layout.tsx` 中的实例保持策略；修改多账户页面时要避免切换账户导致组件被意外销毁或跨账户状态串扰。

涉及 Ant Design 组件、主题 token、表单、Modal、Table、Message、Notification 等用法时，先查询 Ant Design 文档或本地 `ant-design` skill。

## 代码风格

- 使用 TypeScript、ES modules、React 函数组件。
- 保持现有两个空格缩进、单引号和分号风格。
- React 组件使用 `PascalCase`，hook 使用 `use` 前缀。
- 后台模块文件名使用描述性 kebab-case。
- 新增抽象前先确认是否已有同类 helper、hook、service 或模块。

## 修改策略

保持改动范围聚焦，不做与任务无关的重构、格式化或依赖升级。

如果工作区已有未提交改动，不要回滚用户改动。需要改同一文件时先理解现有 diff，再做最小编辑。

新增功能要同时考虑 main、preload、renderer、shared types、日志、错误展示和验证命令。涉及用户可见 UI 的改动，完成后应通过本地应用或截图验证主要状态。
