# Zmind 开发计划

> 一个仿照 XMind 的桌面脑图工具，基于 Tauri 2 构建。
>
> 状态：**M6 已完成，Windows MVP 可发布**
> 更新日期：2026-11-11
>
> 已确认：前端使用 Vue 3；首版只做 Windows；XMind 格式兼容（导入/导出）推迟到后续版本；UI 采用 shadcn-vue + Reka UI + Tailwind CSS，界面尽量贴近 XMind 风格；MVP 节点标题为纯文本 + 换行，富文本放到 Phase 2；界面支持中英文；提供便携版；产品定位为纯本地单机工具，不做云同步/协作。

---

## 1. 项目目标

做一款轻量、快速、跨平台的桌面脑图工具，覆盖 XMind 的核心使用场景：

- 用键盘快速录入和整理思路（Tab / Enter 建节点）
- 自动布局，节点样式和主题可定制
- 本地文件存储，打开/保存/自动保存
- 导出图片、Markdown，导入 Markdown / OPML
- 单机优先，无需登录、无需联网

**非目标（首版不做）**

- 多人实时协作、云端同步、依赖网络的功能（如 AI 生成）
- 在线模板市场、账号体系
- macOS / Linux 发布（架构保持跨平台，首版只交付 Windows）
- XMind 格式导入/导出
- 甘特图、矩阵图等非脑图类视图

---

## 2. 功能范围

### 2.1 MVP（第一个可用版本）

| 模块 | 功能 |
| --- | --- |
| 文档 | 新建、打开、保存、另存为、最近文件、未保存提示 |
| 画布 | 平移、缩放、适应窗口、缩放比例显示、小地图（可选） |
| 节点 | 中心主题、分支主题、子主题；新建/删除/编辑/折叠 |
| 键盘 | Tab 子主题、Enter 同级、Shift+Enter 换行、Delete 删除、方向键导航、F2 编辑 |
| 拖拽 | 拖动节点调整父子关系与排序 |
| 布局 | 逻辑图（向右/向左/双向）、思维导图、组织结构图（向下） |
| 样式 | 节点填充/边框/文字颜色、字号、字体、连线样式、圆角 |
| 主题 | 内置 5–8 套配色主题，一键切换 |
| 撤销/重做 | 至少 100 步，覆盖结构、文本、样式变更 |
| 导出 | PNG、SVG、Markdown |
| 导入 | Markdown、OPML |
| 视图 | 大纲视图与画布双向联动 |
| 其他 | 自动保存与崩溃恢复、快捷键面板、中英文界面 |

### 2.2 Phase 2（增强）

- 关系线、边界、概要、标注、备注
- 图标/贴纸/优先级/任务进度标记
- 图片插入（本地文件、粘贴）
- 超链接、附件
- 搜索、筛选、聚焦模式
- 演示模式（逐节点展开）
- 多标签页 / 多文档
- 导出 PDF
- 更多结构：鱼骨图、时间轴、括号图、树形表格
- 富文本（加粗、斜体、颜色、列表）

### 2.3 Phase 3（探索）

- XMind 格式导入/导出（`.xmind`，兼容 content.json 与旧版 content.xml）
- macOS / Linux 版本
- 移动端（Tauri 2 iOS/Android）
- 插件系统
- 大纲与脑图混排、白板模式

---

## 3. 技术选型

| 层面 | 选型 | 理由 |
| --- | --- | --- |
| 桌面框架 | **Tauri 2.x** | 体积小、内存占用低、Rust 后端便于文件与导出处理；架构上保留跨平台能力 |
| 前端框架 | **Vue 3.5 + TypeScript + Vite** | Composition API + `<script setup>`，响应式系统适合画布状态；生态成熟 |
| 构建 | Vite 7 + pnpm | 启动快、依赖管理清晰 |
| 状态管理 | **Pinia + Immer** | Vue 官方方案，易与 Immer patches 结合实现撤销重做 |
| UI 组件 | **shadcn-vue + Reka UI** + Tailwind CSS 4 | 组件源码可控、样式可深度定制；Reka UI 提供菜单/弹层/焦点管理；贴合 XMind 的轻量桌面风格 |
| 通知 | vue-sonner | 轻量 toast，风格简洁 |
| 虚拟列表 | @tanstack/vue-virtual | 大纲视图与搜索结果虚拟滚动 |
| 图标 | lucide-vue-next | 轻量、风格统一 |
| 画布交互 | 自研指针/滚轮处理 + 可选 d3-zoom | 需要精细控制节点命中、拖拽、框选 |
| 布局 | 自研树布局 + 可选 elkjs | 脑图布局规则明确，自研可控性更高 |
| 富文本（Phase 2） | TipTap / ProseMirror（Vue 绑定） | 备注、富文本节点编辑 |
| 国际化 | vue-i18n | 中英文切换 |
| 校验 | Zod | 文档 schema 校验与迁移 |
| 测试 | Vitest + @testing-library/vue + Playwright | 单元、组件、端到端 |
| Rust 依赖 | `serde` / `serde_json` / `zip` / `quick-xml` / `image` / `resvg` | 文件读写、后续 XMind 解析、图片与 SVG 处理 |

**渲染方案说明**

MVP 采用 **DOM + SVG 混合渲染**：

- 节点用绝对定位的 DOM 元素渲染，便于文本编辑、无障碍和 CSS 主题。
- 连线用单层 SVG 渲染，按视口裁剪。
- 画布容器通过 `transform: translate() scale()` 实现平移缩放。
- 节点数量超过 2000 时启用视口裁剪；超过 5000 时评估切换 Canvas/PixiJS 渲染层。

不直接在 MVP 引入 Canvas 全量渲染，原因是文本编辑、选中态、主题切换用 DOM 实现成本更低。

### 3.1 界面风格与组件分工

目标：视觉与交互尽量贴近 XMind 的轻量桌面工具风格——窄工具栏、浮动样式条、紧凑右键菜单、无边框浮层、克制留白，避免中后台组件的厚重感。

| 界面区域 | 实现方式 |
| --- | --- |
| 应用菜单栏 | Tauri 原生菜单，不使用 Web 组件 |
| 顶部工具栏 / 缩放控件 | 自定义 Tailwind 组件 + lucide-vue-next 图标 |
| 右键菜单 / 浮动样式条 / 颜色选择 | shadcn-vue ContextMenu、Popover、DropdownMenu（基于 Reka UI） |
| 设置 / 导出 / 快捷键面板 | shadcn-vue Dialog、Tabs、Input、Switch、Slider |
| 提示与通知 | Tooltip + vue-sonner |
| 大纲视图 / 搜索结果 | @tanstack/vue-virtual 虚拟滚动 |
| 画布 / 节点 / 连线 | 完全自研 DOM + SVG，不使用组件库 |
| 主题与配色 | CSS 变量 + Tailwind 主题扩展，支持明暗切换 |

原则：组件库只负责画布之外的界面 chrome，脑图的核心交互和布局全部自研，避免被组件库的默认视觉和交互约束。

---

## 4. 系统架构

### 4.1 进程与模块

```
┌─────────────────────────────────────────────┐
│ Tauri 应用                                   │
│                                             │
│  ┌─────────────────┐      ┌────────────────┐  │
│  │ Rust 后端        │ IPC  │ WebView 前端    │  │
│  │                 │◄────►│                │  │
│  │ - 文件读写       │      │ - 文档模型      │  │
│  │ - 最近文件       │      │ - 布局引擎      │  │
│  │ - 自动保存       │      │ - 渲染引擎      │  │
│  │ - 图片/PDF 导出   │      │ - 交互与快捷键   │  │
│  │ - 原生菜单/对话框 │      │ - UI 组件       │  │
│  └─────────────────┘      │ - 状态管理      │  │
│                           └────────────────┘  │
└─────────────────────────────────────────────┘
```

**职责划分原则**

- 前端负责所有可视化与编辑交互，文档模型以 JSON 形式存在前端内存。
- Rust 只做“前端做不了或做起来麻烦”的事：文件系统、ZIP 解压、PDF 生成、系统菜单、最近文件、单实例。
- 文件读写通过自定义 command 完成，避免前端直接持有任意路径权限。

### 4.2 前端分层

```
src/
├── domain/          # 纯 TS，无 Vue 依赖
│   ├── model/       # 文档、节点、样式、主题类型
│   ├── commands/    # 增删改节点、移动、样式变更等命令
│   ├── history/     # 撤销重做栈（Immer patches）
│   ├── layout/      # 布局算法
│   ├── serialization/ # 文档 JSON 序列化/校验
│   └── importer/    # Markdown / OPML 解析
├── engine/          # 渲染与交互引擎
│   ├── viewport/    # 平移、缩放、坐标换算
│   ├── hit-test/    # 命中检测、框选
│   ├── drag/        # 拖拽排序与改变父子关系
│   └── text-measure/ # 文本测量与换行
├── stores/          # Pinia stores
├── composables/     # 可复用组合式逻辑
├── components/      # Vue UI
│   ├── canvas/      # 画布、节点、连线、覆盖层
│   ├── outline/     # 大纲视图
│   ├── panels/      # 样式、主题、备注面板
│   ├── toolbar/     # 工具栏、浮动菜单
│   └── common/      # 通用组件
├── services/        # Tauri IPC 封装
│   ├── file.ts
│   ├── export.ts
│   └── settings.ts
├── i18n/
└── App.vue
```

### 4.3 Rust 侧模块

```
src-tauri/src/
├── main.rs
├── lib.rs
├── commands/
│   ├── document.rs   # 读写 .zmind
│   ├── recent.rs     # 最近文件
│   ├── import.rs     # Markdown / OPML
│   ├── export.rs     # PDF / 图片落盘
│   └── app.rs        # 窗口、菜单、单实例
├── menu.rs
└── state.rs
```

---

## 5. 数据模型

### 5.1 文档结构

```ts
interface MindMapDocument {
  schemaVersion: 1
  id: string
  title: string
  root: TopicNode
  themeId: string
  structure: 'logic-right' | 'logic-left' | 'logic-both' | 'org-down' | 'mind-map'
  relationships: Relationship[]
  boundaries: Boundary[]
  summaries: Summary[]
  createdAt: string
  updatedAt: string
}

interface TopicNode {
  id: string
  title: string
  children: TopicNode[]
  collapsed: boolean
  style?: NodeStyle
  notes?: string
  markers?: Marker[]
  hyperlink?: string
  image?: ImageRef
  layout?: { width?: number; offsetX?: number; offsetY?: number }
  meta?: Record<string, unknown>
}

interface NodeStyle {
  fill?: string
  borderColor?: string
  borderWidth?: number
  borderRadius?: number
  fontFamily?: string
  fontSize?: number
  fontWeight?: 'normal' | 'bold'
  fontStyle?: 'normal' | 'italic'
  textColor?: string
  textAlign?: 'left' | 'center' | 'right'
  lineColor?: string
  lineWidth?: number
  lineStyle?: 'solid' | 'dashed' | 'dotted'
  shape?: 'rounded' | 'rect' | 'ellipse' | 'underline' | 'none'
}
```

**设计要点**

- 树结构而非扁平图，符合脑图语义，布局和增删改更简单。
- 关系线、边界、概要作为文档级附加对象，通过节点 id 引用。
- 所有 id 使用 UUID，便于跨设备合并与后续协作扩展。
- 文档带 `schemaVersion`，为格式迁移留出空间。

### 5.2 撤销/重做

采用 **Immer patches**：

- 每次命令执行产生 `patches` 与 `inversePatches`，压入历史栈。
- 历史栈上限 100 步，超出丢弃最旧记录。
- 连续文本输入按时间窗口合并（500ms）为一步。
- 拖拽、批量样式修改作为单条命令入栈。

### 5.3 布局引擎

1. 递归计算每个节点文本尺寸（Canvas `measureText`，缓存结果）。
2. 自底向上计算子树高度，自顶向下分配坐标。
3. 支持逻辑图、组织结构图、双向逻辑图。
4. 布局结果缓存：节点内容、样式、结构、折叠状态变化时才重算对应子树。
5. 大文档（>2000 节点）将布局放入 Web Worker，主线程只做渲染。

### 5.4 渲染与交互

- 视口容器：`transform: translate(x, y) scale(s)`。
- 节点层：绝对定位 DOM，节点组件用 `v-memo` / `shallowRef` + 节点版本号控制重渲染。
- 连线层：单个 SVG，路径使用三次贝塞尔曲线。
- 编辑：双击节点显示浮动文本编辑框（MVP 为纯文本 + 换行），Enter 确认、Shift+Enter 换行、Esc 取消。
- 拖拽：指针事件 + 命中检测，拖拽时显示插入位置指示线。
- 键盘导航：方向键在节点间移动，Tab/Enter 创建节点，Delete 删除。

### 5.5 文件格式

**`.zmind`（自有格式）**

MVP 使用单文件 JSON：

```json
{
  "schemaVersion": 1,
  "id": "uuid",
  "title": "未命名脑图",
  "root": { "id": "uuid", "title": "中心主题", "children": [] },
  "themeId": "default",
  "structure": "logic-right",
  "relationships": [],
  "boundaries": [],
  "summaries": [],
  "createdAt": "2026-11-11T10:00:00Z",
  "updatedAt": "2026-11-11T10:00:00Z"
}
```

Phase 2 升级为 ZIP 容器（`document.json` + `resources/` + `thumbnail.png`），兼容图片等二进制资源。

**自动保存**

- 编辑后 2 秒防抖写入应用数据目录下的 `autosave/<docId>.zmind`。
- 正常保存后清除对应自动保存文件。
- 启动时检测到未正常关闭的自动保存文件，提示恢复。

**XMind 兼容（Phase 3）**

- 首版与 Phase 2 不实现 XMind 格式的导入/导出，避免格式差异拖慢核心体验。
- 后续实现时：`.xmind` 是 ZIP，优先读取 `content.json`（XMind 2020+），回退 `content.xml`（XMind 8）。
- 只映射主题树、标题、备注、标签、基本样式；不支持的高级对象跳过并给出提示。
- 在文档中明确标注“非 100% 还原”，避免用户误解。

---

## 6. 目录结构（目标）

```
zmind/
├── src-tauri/
│   ├── src/
│   │   ├── main.rs
│   │   ├── lib.rs
│   │   ├── commands/
│   │   └── menu.rs
│   ├── capabilities/
│   ├── icons/
│   ├── Cargo.toml
│   └── tauri.conf.json
├── src/
│   ├── domain/
│   ├── engine/
│   ├── stores/
│   ├── composables/
│   ├── components/
│   ├── services/
│   ├── i18n/
│   └── App.vue
├── public/
├── tests/
│   └── e2e/
├── package.json
├── vite.config.ts
├── tailwind.config.ts
└── PLAN.md
```

---

## 7. 里程碑与排期

以单人全职开发估算，MVP 约 5–7 周（只做 Windows，比原计划略短）。若为业余时间开发，按 2–3 倍时间估算。

### M0：项目脚手架（2–3 天）

- [x] 初始化 Git 仓库、`.gitignore`、README
- [x] 用 `create-tauri-app` 初始化 Tauri 2 + Vue 3 + TS
- [x] 配置 ESLint、Prettier、Vitest
- [x] 配置 Tailwind CSS 与 shadcn-vue
- [x] 跑通 `pnpm tauri dev`，确认 Windows 下可启动

**状态**：已完成（2026-11-11）。实际版本：Tauri 2.12、Vue 3.5、Vite 8、Tailwind CSS 4、ESLint 10、Vitest 5。

**交付物**：可启动的空应用窗口。

### M1：数据模型与画布（1 周）

- [x] 定义文档/节点/样式类型与 Zod schema
- [x] 实现文档 store（Pinia + Immer）
- [x] 实现树操作命令：新增子节点/兄弟节点、删除、移动、重命名
- [x] 实现基础布局算法（逻辑图向右）
- [x] 实现节点渲染、连线渲染
- [x] 实现平移、缩放、适应窗口
- [x] 实现选中与键盘导航

**交付物**：能创建和编辑节点、自动排布的静态脑图。

**状态：已完成（2026-11-11）**。Demo 文档可渲染、节点可增删改、逻辑图自动排布、画布平移缩放与适应窗口、选中与键盘导航均已在 Windows 下验证；21 项单元测试通过。

### M2：编辑体验与撤销重做（1 周）

- [x] 节点内联编辑（双击/F2、Enter 确认、Shift+Enter 换行、Esc 取消）——M1 已提前完成
- [x] 拖拽排序与改变父子关系
- [x] 撤销/重做（Immer patches，100 步）
- [x] 折叠/展开子树——M1 已提前完成
- [x] 快捷键系统与快捷键面板
- [x] 组织结构图、双向逻辑图布局

**交付物**：可流畅编辑的脑图应用。

**状态：已完成（2026-11-11）**。节点支持拖拽调整父子关系与同级顺序，撤销/重做基于 Immer patches（上限 100 步），新增快捷键面板与顶栏撤销/重做、布局切换；布局支持逻辑图向右/向左/双向与组织结构图。36 项单元测试通过，并在 Windows 下通过 CDP 验证新增节点、撤销重做、拖拽、快捷键面板和四种布局。

### M3：样式、主题与面板（1 周）

- [x] 节点样式编辑面板
- [x] 连线样式
- [x] 内置 6 套主题，支持自定义主题保存
- [x] 大纲视图与画布联动
- [x] 中英文 i18n
- [x] 深色/浅色模式

**交付物**：视觉上接近 XMind 的可用产品。

**状态：已完成（2026-11-11）**。新增节点/连线样式面板（形状、填充、边框、字号、字重、字形、对齐、连线颜色/宽度/线型）、6 套内置主题与基于当前主题的自定义主题保存、大纲视图与画布选中联动、中英文切换、深浅色模式；语言、面板开关与深色模式通过 localStorage 持久化。52 项单元测试通过，并在 Windows 下通过 CDP 验证样式修改与撤销、主题切换、自定义主题保存、大纲联动、语言与深色模式切换。

### M4：文件与持久化（1 周）

- [x] Rust 侧实现 `.zmind` 读写 command
- [x] 新建/打开/保存/另存为
- [x] 最近文件列表
- [x] 自动保存与崩溃恢复
- [x] 未保存修改提示
- [x] 原生菜单与文件关联（`.zmind`）

**交付物**：文件可安全保存与恢复。

**状态：已完成（2026-11-11）**。Rust 侧新增 `.zmind` 原子读写、恢复快照与路径校验命令；前端新增新建/打开/保存/另存为、最近文件列表、未保存修改提示、800ms 防抖自动保存与启动恢复提示；原生菜单支持中英文切换，`.zmind` 文件关联与单实例打开已接入。63 项前端单元测试与 5 项 Rust 测试通过，并在 Windows 下通过 WebView2 CDP、原生菜单命令和二次启动文件关联验证了打开、保存、自动保存、恢复、未保存提示、关闭拦截与退出流程。

### M5：导入导出（1 周）

- [x] 导出 PNG（前端 canvas 栅格化，支持 1x/2x/3x）
- [x] 导出 SVG
- [x] 导出 Markdown
- [x] 导入 Markdown / OPML
- [x] 导出 PDF（前端打印或 Rust 生成）
- [x] 导出进度与错误提示

**交付物**：完整的导入导出闭环（不含 XMind）。

**状态：已完成（2026-11-11）**。新增 Rust 侧导入文件读取与二进制/文本导出写入命令、SVG 渲染器、SVG→PNG 栅格化（1x/2x/3x）、Markdown 导出、Markdown/OPML 解析器、导出/导入 store、头部导出菜单与导入按钮、进度覆盖层、错误弹窗与成功提示、打印专用 CSS。80 项前端单元测试与 7 项 Rust 测试通过；在 Windows 下通过原生保存/打开对话框验证了 Markdown/SVG/PNG 1x-3x 导出（PNG 尺寸分别为 576×555、1152×1110、1728×1665）、Markdown/OPML 导入、未保存提示、非法 OPML 错误提示，以及 PDF 打印视图与 `window.print()` 调用。

### M6：打磨与发布（1 周）

- [x] 性能优化：视口裁剪、布局缓存、节点 memo
- [x] 空状态、引导页、示例文档
- [x] 错误边界与日志
- [x] 单元/组件/E2E 测试补齐
- [x] Windows 安装版与便携版打包
- [ ] 自动更新（可选，暂缓）

**交付物**：可对外分发的 Windows MVP 安装包。

**状态：已完成（2026-11-11）**。新增按视口矩形裁剪节点与连线、基于文档对象的布局缓存、节点 `v-memo`；新增首次启动引导页、空白文档空状态、可重新打开的引导入口与中英文示例文档；新增 Vue 全局错误处理、window error / unhandledrejection 捕获、错误覆盖层与可复制日志；新增 102 项前端单元/组件测试、7 项 Playwright E2E 测试与 8 项 Rust 测试；新增 NSIS 安装包与便携版 zip 脚本，便携版通过 `portable.marker` 将 WebView2 用户数据与恢复快照放在程序旁的 `data` 目录。已验证安装包产物 `src-tauri/target/release/bundle/nsis/Zmind_0.1.0_x64-setup.exe` 与便携版 `release/Zmind-0.1.0-portable.zip`；便携版启动后使用 `data/EBWebView`，自动保存写入 `data/recovery.json`。自动更新为可选项，首版暂缓。

---

## 8. 测试与质量

| 层级 | 工具 | 覆盖内容 |
| --- | --- | --- |
| 单元测试 | Vitest | 树操作、布局、历史栈、序列化、导入器 |
| 组件测试 | @testing-library/vue | 节点渲染、编辑框、面板交互 |
| 端到端 | Playwright（Web 构建） | 新建→编辑→保存→导出主流程 |
| 桌面冒烟 | tauri-driver / 手动清单 | 窗口、菜单、文件对话框、文件关联 |
| Rust 测试 | `cargo test` | 文件读写、路径校验 |

**质量门槛**

- 核心 domain 模块测试覆盖率 ≥ 80%
- 1000 节点文档平移缩放 ≥ 55 FPS（中端笔记本）
- 1000 节点布局耗时 < 100ms
- 冷启动到可交互 < 1.5s
- Windows NSIS 安装包体积 < 15MB

---

## 9. 打包与发布

首版只发布 Windows，同时提供安装版和便携版：

- **安装版**：NSIS 安装包，配置、最近文件、自动保存写入 `%APPDATA%\zmind`
- **便携版**：免安装 ZIP，启动时检测便携模式，数据写入 exe 同级 `data/` 目录，不污染系统
- 两种形态共用同一套代码，通过启动参数或目录标记区分数据根路径
- 最低支持 Windows 10 1809+（WebView2 要求）
- 使用 `tauri-action` 在 GitHub Actions 构建 Windows 安装包与便携包
- macOS（DMG）与 Linux（AppImage/deb）放到后续版本，代码结构保持跨平台
- 版本号遵循 SemVer，`0.x` 阶段允许破坏性变更

---

## 10. 风险与应对

| 风险 | 影响 | 应对 |
| --- | --- | --- |
| 富文本编辑复杂度高 | 排期延长 | MVP 先纯文本 + 换行，Phase 2 再引入 TipTap |
| 大文档渲染卡顿 | 体验差 | 视口裁剪 + 布局缓存 + Web Worker；必要时切换 Canvas 渲染 |
| WebView2 版本差异 | 旧系统行为不一致 | 声明最低 Windows 版本，启动时检测 WebView2 并提示安装 |
| 中文字体渲染差异 | 导出一致性差 | 导出时嵌入开源中文字体子集 |
| 自动更新与签名配置复杂 | 发布受阻 | 首版手动分发，后续再接入自动更新 |

---

## 11. 决策记录

**已确认**

- 前端框架：Vue 3 + TypeScript
- UI 组件库：shadcn-vue + Reka UI + Tailwind CSS，界面贴近 XMind 风格
- 首版平台：仅 Windows，架构保持跨平台
- XMind 格式兼容：推迟到 Phase 3
- 富文本：MVP 节点标题为纯文本 + 换行，整节点样式；Phase 2 再引入富文本
- 界面语言：中英文双语
- 产品定位：纯本地单机工具，不做云同步/协作
- 安装形态：同时提供 NSIS 安装版与免安装便携版

**待确认**

暂无。下一步进入 M0：项目脚手架。

---

## 12. MVP 验收清单

- [ ] 能新建、编辑、保存、重新打开 `.zmind` 文件
- [ ] Tab/Enter/Delete/方向键完成基本录入
- [ ] 拖拽可改变节点层级与顺序
- [ ] 撤销/重做覆盖结构、文本、样式变更
- [ ] 逻辑图、组织结构图两种布局可切换
- [ ] 6 套主题可切换
- [ ] 导出 PNG/SVG/Markdown 内容正确
- [ ] 关闭未保存文档时提示
- [ ] 崩溃后可恢复自动保存内容
- [ ] Windows 安装包可正常安装、卸载
