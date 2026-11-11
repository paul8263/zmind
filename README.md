# Zmind

一个仿照 XMind 的本地脑图桌面工具，基于 Tauri 2 + Vue 3 构建。

## 技术栈

- **桌面框架**：Tauri 2（Rust）
- **前端**：Vue 3 + TypeScript + Vite
- **状态管理**：Pinia + Immer（M1 引入）
- **UI**：Tailwind CSS 4 + shadcn-vue + Reka UI
- **测试**：Vitest + @testing-library/vue + Playwright

## 环境要求

- Node.js 20+
- pnpm
- Rust（stable，MSVC toolchain）
- Visual Studio Build Tools（C++ 桌面开发工作负载）
- Windows 10 1809+，WebView2 Runtime

> 国内网络下，项目已通过 `.cargo/config.toml` 将 crates.io 指向 rsproxy.cn 镜像；如不需要可删除该文件。

## 常用命令

```bash
pnpm install        # 安装依赖
pnpm dev            # 启动前端开发服务器
pnpm tauri dev      # 启动桌面应用
pnpm build          # 类型检查 + 前端构建
pnpm tauri build    # 构建 Windows 安装包
pnpm lint           # ESLint
pnpm format         # Prettier
pnpm test           # Vitest（watch）
pnpm test:run       # Vitest（单次）
pnpm test:e2e       # Playwright 冒烟测试
pnpm package:installer  # 构建 NSIS 安装包
pnpm package:portable   # 构建便携版 zip
pnpm package:windows    # 一次构建安装包与便携版
```

## 打包与发布

- **NSIS 安装包**：`pnpm package:installer`，产物位于 `src-tauri/target/release/bundle/nsis/`。
- **便携版**：`pnpm package:portable`，产物位于 `release/Zmind-<version>-portable.zip`。
- **一次构建两者**：`pnpm package:windows`。
- 便携版包含 `Zmind.exe`、`portable.marker` 与 README；首次启动会在程序旁创建 `data/` 作为 WebView2 用户数据目录，不写入系统用户目录。运行便携版仍需要系统已安装 WebView2 Runtime（Windows 10/11 通常已内置）。
- 安装包与便携版均未配置自动更新；首版按计划暂缓该可选功能。

## 目录结构

```
src/
├── domain/       # 文档模型、命令、布局、导入导出
├── stores/       # Pinia stores
├── composables/  # 组合式逻辑
├── components/   # canvas / onboarding / system / inspector 等
├── lib/          # Tauri IPC 封装与通用工具
├── i18n/         # 中英文文案
├── styles/       # 全局样式与主题变量
└── App.vue
e2e/              # Playwright 冒烟测试
scripts/          # 打包脚本
src-tauri/        # Rust 后端
```

## 当前进度

M6 已完成：新增按视口裁剪节点与连线、基于文档对象的布局缓存、节点 `v-memo`；新增首次启动引导页、空白文档空状态与中英文示例文档；新增 Vue 全局错误处理、window error / unhandledrejection 捕获、错误覆盖层与可复制日志；新增画布与节点右键菜单，支持边缘翻转、键盘导航和常用主题操作；新增 Playwright 冒烟测试；配置 NSIS 安装包与便携版 zip。103 项前端单元/组件测试、9 项 E2E 测试与 8 项 Rust 测试通过，`lint`、`typecheck`、`build`、`format:check` 均通过。Windows MVP 已具备发布产物；便携版已验证启动后使用程序旁 `data/EBWebView`，自动保存写入 `data/recovery.json`；自动更新按计划暂缓。完整计划见 [PLAN.md](./PLAN.md)。
