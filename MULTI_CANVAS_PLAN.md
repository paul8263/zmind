# 多画布（Sheet）功能方案

> 状态：**已实施（2026-11-12）**
> 日期：2026-11-12
> 目标：一个 `.zmind` 项目包含多个相互隔离的脑图画布，窗口底部提供类似 XMind 的画布管理栏。

---

## 1. 目标与交互定义

- 一个项目（工作簿）包含 N 个画布（Sheet），每个画布是一张独立的脑图。
- 画布之间完全隔离：节点树、主题、布局结构、关系线、撤销历史、选中节点、缩放平移互不影响。
- 窗口底部增加画布管理栏，支持：新建、切换、重命名、复制、删除、拖动排序、左右滚动溢出。
- 保存、另存为、自动保存、崩溃恢复都以整个项目为单位，仍然是单个 `.zmind` 文件。
- 至少保留 1 个画布；删除画布需二次确认，且不进入撤销栈。
- 现有单画布文件可直接打开并自动升级，不需要用户手动迁移。

**非目标（本期不做）**

- 画布间复制/移动节点、跨画布链接。
- 多窗口、多标签页同时打开多个项目。
- 每个画布独立文件、项目目录结构。
- 导出“全部画布”为单个文件（可放后续版本）。

---

## 2. 现状与改造点

当前实现是严格的单文档结构：

| 位置                                      | 现状                                     | 改造方向                                   |
| ----------------------------------------- | ---------------------------------------- | ------------------------------------------ |
| `src/domain/model/types.ts`               | `MindMapDocument` 同时承担“项目”和“画布” | 拆为 `MindMapWorkbook` + `MindMapSheet`    |
| `src/domain/model/schema.ts`              | 只校验 schemaVersion 1                   | 新增 workbook schema，并支持 v1 → v2 迁移  |
| `src/stores/document.ts`                  | 单个 `doc`、单份 undo/redo 栈            | 改为 workbook + 活动画布，历史按画布隔离   |
| `src/stores/file.ts`                      | 序列化/恢复/指纹都基于单个 doc           | 改为基于 workbook；恢复格式兼容旧版本      |
| `src/components/canvas/MindMapCanvas.vue` | 监听 `docStore.doc` 渲染                 | 通过 `doc` getter 保持兼容，切换时重置视图 |
| `src/stores/export.ts`                    | 导出当前 doc；导入替换当前 doc           | 导出活动画布；导入改为新增画布             |
| `src-tauri/src/file_io.rs`                | `.zmind` 当纯文本读写                    | **无需改动**（格式升级在前端完成）         |
| `src/App.vue`                             | header + main + 浮层                     | main 下方增加 `SheetBar`                   |

> Rust 侧只做文件读写，不解析 JSON，因此文件格式升级不涉及 Rust 改动。

---

## 3. 数据模型

### 3.1 类型定义

```ts
// 单个画布，字段基本沿用现有 MindMapDocument，去掉 schemaVersion
export interface MindMapSheet {
  id: string
  title: string
  root: TopicNode
  themeId: string
  structure: Structure
  relationships: Relationship[]
  boundaries: Boundary[]
  summaries: Summary[]
  createdAt: string
  updatedAt: string
}

export interface MindMapWorkbook {
  schemaVersion: 2
  id: string
  title: string
  sheets: MindMapSheet[]
  activeSheetId: string
  createdAt: string
  updatedAt: string
}
```

建议将现有 `MindMapDocument` **机械重命名**为 `MindMapSheet`，由 TypeScript 编译器找出全部引用；不保留类型别名，避免长期歧义。影响面主要是 domain、stores、export、tests，均为编译期可发现。

### 3.2 文件格式（`.zmind`）

```json
{
  "schemaVersion": 2,
  "id": "uuid",
  "title": "未命名脑图",
  "sheets": [
    {
      "id": "uuid",
      "title": "画布 1",
      "root": { "id": "uuid", "title": "中心主题", "children": [], "collapsed": false },
      "themeId": "classic",
      "structure": "logic-right",
      "relationships": [],
      "boundaries": [],
      "summaries": [],
      "createdAt": "2026-11-12T10:00:00Z",
      "updatedAt": "2026-11-12T10:00:00Z"
    }
  ],
  "activeSheetId": "uuid",
  "createdAt": "2026-11-12T10:00:00Z",
  "updatedAt": "2026-11-12T10:00:00Z"
}
```

### 3.3 兼容与迁移

- `parseWorkbook(input)` 统一入口：
  - `schemaVersion === 2`：按 workbook schema 校验。
  - `schemaVersion === 1`：按旧 document schema 校验后包装成单画布 workbook。
    - `workbook.id` 使用新 UUID
    - `workbook.title` = 旧 `doc.title`
    - `sheet.id` = 旧 `doc.id`
    - `sheet.title` = 旧 `doc.title`
    - 其余字段原样迁移，时间戳保留
  - 其他版本：返回解析失败，沿用现有“文件格式无效”提示。
- 旧版自动恢复快照（`{ path, savedAt, document }`）同样走迁移，恢复后直接以 workbook 形式写回。
- 文件扩展名仍为 `.zmind`，文件关联、最近文件、原生对话框均无需改动。
- 该结构与 XMind 的 workbook / sheet 概念对齐，为后续 `.xmind` 导入导出留出映射空间。

**放弃的方案**：每个画布一个 `.zmind` 文件、项目目录保存多个文件。原因是会破坏现有单文件关联与便携版使用习惯，且自动保存、最近文件、另存为都要重写。

---

## 4. Store 改造

### 4.1 状态结构

```ts
state: {
  workbook: MindMapWorkbook
  activeSheetId: string
  selectedNodeId: string | null
  editingNodeId: string | null
  editingSource: 'canvas' | 'outline'
  selectionBySheet: Record<string, string | null> // 仅内存
  historyBySheet: Record<string, { undo: HistoryEntry[]; redo: HistoryEntry[] }>
  revision: number
}
```

关键点：

- 保留 **`doc` getter** 返回当前活动画布，现有 `docStore.doc.root`、`docStore.doc.themeId` 等大量调用无需改动。
- 新增 `sheets`、`activeSheet`、`activeSheetId` getter。
- `canUndo` / `canRedo` 读取当前画布的历史栈。
- `revision` 仍然是所有响应式更新的统一信号。

### 4.2 节点修改与历史隔离

当前 `mutate` 对单个 doc 生成 Immer patches。改造后：

1. 取当前活动画布对象（`toRaw(activeSheet)`）。
2. `produceWithPatches(sheet, fn)` 生成只针对该画布的 patches。
3. 将新 sheet 按 **id** 写回 `workbook.sheets`，同时更新画布与 workbook 的 `updatedAt`。
4. patches/inverse 存入 `historyBySheet[activeSheetId]`。

这样 patches 的路径只相对画布内部，画布在数组中的位置变化、其他画布增删都不会破坏撤销路径。

**不建议**对整个 workbook 生成 patches：sheet 数组索引会进入 patch 路径，删除/排序画布后历史会失效。

### 4.3 画布操作（不进入撤销栈）

| Action                   | 说明                                                     |
| ------------------------ | -------------------------------------------------------- |
| `addSheet()`             | 新建空白画布，标题“画布 N”，切换过去并进入根节点选中状态 |
| `switchSheet(id)`        | 保存当前选中节点，清空编辑状态，恢复目标画布选中节点     |
| `renameSheet(id, title)` | 去空格；空标题回退为“画布 N”                             |
| `duplicateSheet(id)`     | 深拷贝节点树，生成新 id，标题“X 副本”，历史为空          |
| `removeSheet(id)`        | 至少保留 1 个画布；删除后激活相邻画布，并清理其历史      |
| `moveSheet(id, index)`   | 画布栏拖动排序                                           |
| `setActiveSheetId`       | 仅切换，不标记 dirty                                     |

### 4.4 切换画布时的行为

- 正在编辑的节点：先提交当前编辑（等同失焦提交），再切换。
- 选中节点：按画布记忆（内存），首次进入默认选中根节点。
- 撤销/重做：各画布独立，切换后按钮状态随当前画布变化。
- 缩放/平移：每个画布独立记忆；首次进入时执行“适应窗口”。
- 大纲视图、主题面板、样式面板：自动读取当前画布，无需额外处理。

### 4.5 视图状态

`viewport` store 增加按画布 id 的记忆：

```ts
views: Record<string, { x: number; y: number; scale: number }>
```

`MindMapCanvas` 监听 `docStore.activeSheetId`：切换前保存当前视图，切换后恢复目标视图；没有记录则调用 `fitToView()`。该状态只存在内存，不写入文件。

---

## 5. 文件、自动保存与恢复

- `serializeDocument` → `serializeWorkbook`，保存整个 workbook。
- 指纹（dirty 判断）覆盖 workbook 与全部 sheets，但**排除** `updatedAt` 和 `activeSheetId`：仅切换画布不应把项目标记为已修改。
- 自动保存快照改为 `{ path, savedAt, workbook }`；解析时兼容旧 `{ document }` 结构。
- 新建项目：创建一个包含 1 个空白画布的 workbook。
- 示例文档：创建一个包含示例画布的 workbook。
- 打开/另存为/最近文件/未保存提示/退出拦截：逻辑不变，只是操作对象从 doc 变为 workbook。
- 项目标题：取 workbook.title；窗口标题、默认保存文件名继续使用它。

### 导入

- Markdown / OPML 导入改为**新增一个画布**到当前项目，并切换到该画布，而不是替换当前内容。
- 这样不会触发“未保存修改”对话框，导入后项目变为 dirty。
- 后续如需“导入为新项目”，可再加一个选项。

### 导出

- PNG / SVG / Markdown / PDF 均导出当前活动画布。
- 后续版本可增加“导出全部画布”（Markdown 多级标题、PDF 多页）。

---

## 6. UI：底部画布管理栏

### 6.1 布局

```
┌──────────────────────────────────────────────┐
│ header                                       │
├──────────┬────────────────────────┬────────────┤
│ outline  │ canvas                 │ inspector  │
├──────────┴────────────────────────┴────────────┤
│ [画布 1] [画布 2] [画布 3]  [+]            │ 36px
└──────────────────────────────────────────────┘
```

- 新增 `src/components/sheets/SheetBar.vue`（可再拆 `SheetTab.vue`）。
- `App.vue` 在 `main` 之后渲染 `SheetBar`，全宽、固定高度、顶部边框。
- 画布栏始终显示（即使只有 1 个画布），保证“新建画布”入口可见。

### 6.2 画布项交互

| 操作 | 行为                                       |
| ---- | ------------------------------------------ |
| 单击 | 切换画布                                   |
| 双击 | 行内重命名，Enter 确认、Esc 取消、失焦保存 |
| 右键 | 菜单：重命名、复制、左移、右移、删除       |
| 拖动 | 调整画布顺序，放下后保持当前画布激活       |
| 滚轮 | 横向滚动标签栏                             |
| “+”  | 新建空白画布并切换                         |
| 删除 | 二次确认；仅剩 1 个画布时禁用              |

### 6.3 样式

- 高度约 36px，`border-t`，与现有 header 的紧凑风格一致。
- 活动画布：浅色背景 + 底部 2px 高亮线（深色模式使用对应色）。
- 标签宽度自适应，设置最大宽度（如 180px），超出省略；整体横向滚动，不换行。
- 重命名输入框宽度跟随标签，最小 80px。

### 6.4 快捷键

| 快捷键                | 行为         |
| --------------------- | ------------ |
| `Ctrl+PageDown`       | 下一个画布   |
| `Ctrl+PageUp`         | 上一个画布   |
| `Ctrl+Shift+PageDown` | 当前画布右移 |
| `Ctrl+Shift+PageUp`   | 当前画布左移 |

（如与现有快捷键冲突，实施时再调整；画布内输入框聚焦时不触发。）

### 6.5 国际化

新增文案键：

- `sheet.bar`：画布栏
- `sheet.new`：新建画布
- `sheet.rename`：重命名
- `sheet.duplicate`：复制画布
- `sheet.delete`：删除画布
- `sheet.moveLeft` / `sheet.moveRight`
- `sheet.deleteConfirm`：确认删除画布“{name}”？
- `sheet.lastCannotDelete`：至少保留一个画布
- `sheet.defaultName`：画布 {index}

---

## 7. 边界与规则

- 至少保留 1 个画布；删除最后一个画布的入口禁用。
- 画布标题允许重复；空白标题回退为默认名称。
- 删除画布不可撤销，需确认对话框；撤销栈只覆盖画布内部编辑。
- 切换画布时提交正在进行的节点编辑，清空编辑态。
- 非活动画布不参与布局与渲染，只保留数据，避免多画布放大性能开销。
- 布局缓存已按原始 doc 对象做 WeakMap key，切换画布后天然按画布隔离，无需额外处理。
- 画布数量不设硬上限，但标签栏需支持横向滚动。
- 保存时写入 `activeSheetId`，重新打开恢复到上次画布；仅切换画布不标记 dirty。

---

## 8. 测试计划

### 单元测试

- v1 文件解析后正确包装为单画布 workbook，字段无损。
- v2 workbook schema 校验、缺字段与非法数据拒绝。
- 新建/复制/重命名/删除/排序画布。
- 每个画布独立撤销/重做，互不串栈。
- 删除画布后历史被清理，活动画布正确回退。
- 指纹计算：切换画布不变 dirty，节点修改变 dirty。
- 恢复快照新旧格式解析。

### 组件测试

- `SheetBar` 渲染、激活态、新建、重命名（Enter/Esc/失焦）、删除确认、最后画布禁用删除、右键菜单禁用项。
- 重命名时点击其他画布会先提交。

### E2E

- 新建画布 → 编辑节点 → 切换回第一个画布，内容互不影响。
- 重命名画布后保存、重新打开，名称与活动画布恢复。
- 删除画布后自动切换到相邻画布。
- 拖动排序后保存再打开，顺序保持。
- 在画布 A 撤销不会影响画布 B。
- 旧版单画布 `.zmind` 文件可正常打开，并以单画布项目呈现。

---

## 9. 分阶段实施

### 阶段 1：数据与存储基础（约 1.5–2 天）

- 类型拆分：`MindMapWorkbook` / `MindMapSheet`，全量机械重命名。
- Zod workbook schema 与 v1 → v2 迁移。
- document store 改造：workbook、活动画布、`doc` getter、按画布历史。
- file store 改造：序列化、指纹、恢复、新建、示例文档。
- 单元测试补齐，确保现有 124 项测试全部迁移通过。

**交付**：功能等价于当前单画布，但底层已是多画布模型。

### 阶段 2：画布管理栏（约 1 天）

- `SheetBar` 组件：新建、切换、重命名、删除、右键菜单。
- 按画布记忆选中节点与视图缩放/平移。
- 快捷键、i18n、无障碍标签。
- 组件测试与 E2E。

**交付**：可完整管理多个画布的 Windows 版本。

### 阶段 3：增强（约 0.5–1 天）

- 画布拖动排序、复制画布。
- 导入 Markdown/OPML 作为新画布。
- 原生菜单增加“新建画布”等入口。
- README / PLAN 更新，发布产物重新打包。

---

## 10. 风险与工作量

| 风险                                      | 影响 | 应对                                                   |
| ----------------------------------------- | ---- | ------------------------------------------------------ |
| document store 是核心模块，改动面大       | 高   | 保留 `doc` getter，先完成类型重命名与测试迁移，再改 UI |
| 撤销历史跨画布串栈                        | 中   | patches 只针对画布生成，按画布 id 分栈存储             |
| 自动保存/恢复格式不兼容                   | 中   | 统一 parse 入口，兼容 v1 与旧恢复快照                  |
| 切换画布误标 dirty                        | 低   | 指纹排除 `activeSheetId` 与时间戳                      |
| 现有 124 项单元测试、13 项 E2E 需大量调整 | 中   | 先保证 `docStore.doc` 兼容层，再逐步补多画布用例       |

**总体预估**：3–4 个工作日（单人、含测试与打包）。核心风险集中在阶段 1 的 store 重构。

---

## 11. 已确认决策

1. 底部栏命名使用“画布”。
2. 导入 Markdown / OPML 时新增画布。
3. 删除画布使用确认对话框，且不可撤销。
4. 按画布记忆缩放/平移与选中节点（仅内存，不落盘）。
5. 导出仅针对当前画布。
6. 文件仍为单个 `.zmind`。
