import type { MindMapSheet, MindMapWorkbook, TopicNode } from './types'

export function createId(prefix = 'node'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function createTopic(title = '中心主题'): TopicNode {
  return {
    id: createId(),
    title,
    children: [],
    collapsed: false,
  }
}

export function createBlankSheet(title = '画布 1', rootTitle = '中心主题'): MindMapSheet {
  const now = new Date().toISOString()

  return {
    id: createId('sheet'),
    title,
    root: createTopic(rootTitle),
    themeId: 'classic',
    structure: 'logic-right',
    relationships: [],
    boundaries: [],
    summaries: [],
    createdAt: now,
    updatedAt: now,
  }
}

export function createBlankWorkbook(
  title = '未命名脑图',
  sheetTitle = '画布 1',
  rootTitle = '中心主题',
): MindMapWorkbook {
  const sheet = createBlankSheet(sheetTitle, rootTitle)
  return createWorkbookFromSheet(sheet, title)
}

export function createWorkbookFromSheet(sheet: MindMapSheet, title = sheet.title): MindMapWorkbook {
  const now = new Date().toISOString()

  return {
    schemaVersion: 2,
    id: createId('workbook'),
    title,
    sheets: [sheet],
    activeSheetId: sheet.id,
    createdAt: now,
    updatedAt: now,
  }
}

export function createDemoSheet(locale: 'zh' | 'en' = 'zh'): MindMapSheet {
  const doc = createBlankSheet()
  const content =
    locale === 'en'
      ? {
          title: 'Zmind Example',
          root: 'Zmind',
          branches: [
            {
              title: 'Quick capture',
              children: ['Tab creates a child', 'Enter creates a sibling', 'F2 edits a topic'],
            },
            {
              title: 'Auto layout',
              children: [
                'Nodes are arranged automatically',
                'Connections are generated automatically',
                'Collapse or expand subtrees',
              ],
            },
            {
              title: 'Canvas',
              children: [
                'Drag empty space to pan',
                'Ctrl + wheel to zoom',
                'Fit to window at the bottom right',
              ],
            },
          ],
        }
      : {
          title: 'Zmind 示例',
          root: 'Zmind',
          branches: [
            {
              title: '快速记录',
              children: ['Tab 创建子主题', 'Enter 创建同级主题', 'F2 编辑内容'],
            },
            { title: '自动布局', children: ['节点自动排布', '连线自动生成', '支持折叠子树'] },
            {
              title: '画布操作',
              children: ['拖拽空白处平移', 'Ctrl + 滚轮缩放', '右下角适应窗口'],
            },
          ],
        }

  doc.title = content.title
  doc.root.title = content.root
  doc.root.children = content.branches.map((branch) => {
    const node = createTopic(branch.title)
    node.children = branch.children.map((title) => createTopic(title))
    return node
  })

  return doc
}
