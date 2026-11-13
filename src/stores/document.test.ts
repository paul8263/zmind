// @vitest-environment node

import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import { createBlankSheet, createTopic, createWorkbookFromSheet } from '@/domain/model/document'
import { findNode } from '@/domain/model/tree'

import { useDocumentStore } from './document'

describe('document store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('adds a child and starts editing it', () => {
    const store = useDocumentStore()
    store.mutate((draft) => {
      draft.root.children = []
    })
    store.select(store.doc.root.id)

    store.addChildTo()

    const child = store.doc.root.children[0]
    expect(store.doc.root.children).toHaveLength(1)
    expect(store.selectedNodeId).toBe(child.id)
    expect(store.editingNodeId).toBe(child.id)
  })

  it('renames and removes a node, selecting its parent', () => {
    const store = useDocumentStore()
    store.mutate((draft) => {
      draft.root.children = []
    })
    store.select(store.doc.root.id)
    store.addChildTo()

    const childId = store.selectedNodeId as string
    store.rename(childId, '新标题')

    expect(findNode(store.doc.root, childId)?.title).toBe('新标题')
    expect(store.editingNodeId).toBeNull()

    store.remove(childId)

    expect(findNode(store.doc.root, childId)).toBeNull()
    expect(store.selectedNodeId).toBe(store.doc.root.id)
  })

  it('undoes and redoes a mutation', () => {
    const store = useDocumentStore()
    store.mutate((draft) => {
      draft.root.children = []
    })
    store.select(store.doc.root.id)
    store.addChildTo()
    const childId = store.doc.root.children[0].id

    expect(store.canUndo).toBe(true)

    store.undo()

    expect(store.doc.root.children).toHaveLength(0)
    expect(store.selectedNodeId).toBe(store.doc.root.id)
    expect(store.canRedo).toBe(true)

    store.redo()

    expect(store.doc.root.children[0]?.id).toBe(childId)
  })

  it('restores a renamed title on undo', () => {
    const store = useDocumentStore()
    const node = store.doc.root.children[0]
    const originalTitle = node.title

    store.rename(node.id, '修改后的标题')
    expect(findNode(store.doc.root, node.id)?.title).toBe('修改后的标题')

    store.undo()
    expect(findNode(store.doc.root, node.id)?.title).toBe(originalTitle)

    store.redo()
    expect(findNode(store.doc.root, node.id)?.title).toBe('修改后的标题')
  })

  it('clears the redo stack after a new mutation', () => {
    const store = useDocumentStore()
    const node = store.doc.root.children[0]

    store.rename(node.id, '第一次修改')
    store.undo()
    expect(store.canRedo).toBe(true)

    store.rename(node.id, '第二次修改')
    expect(store.canRedo).toBe(false)
  })

  it('changes structure and supports undoing it', () => {
    const store = useDocumentStore()

    store.setStructure('org-down')
    expect(store.doc.structure).toBe('org-down')

    store.undo()
    expect(store.doc.structure).toBe('logic-right')
  })

  it('changes theme and supports undoing it', () => {
    const store = useDocumentStore()

    store.setTheme('ocean')
    expect(store.doc.themeId).toBe('ocean')

    store.undo()
    expect(store.doc.themeId).toBe('classic')
  })

  it('updates, merges and resets node styles', () => {
    const store = useDocumentStore()
    const node = store.doc.root.children[0]

    store.updateNodeStyle(node.id, { fill: '#ff0000', fontSize: 20 })
    expect(findNode(store.doc.root, node.id)?.style).toMatchObject({
      fill: '#ff0000',
      fontSize: 20,
    })

    store.updateNodeStyle(node.id, { fontSize: 24 })
    expect(findNode(store.doc.root, node.id)?.style).toMatchObject({
      fill: '#ff0000',
      fontSize: 24,
    })

    store.updateNodeStyle(node.id, { fill: undefined })
    const style = findNode(store.doc.root, node.id)?.style
    expect(style?.fill).toBeUndefined()
    expect(style?.fontSize).toBe(24)

    store.resetNodeStyle(node.id)
    expect(findNode(store.doc.root, node.id)?.style).toBeUndefined()
  })

  it('undoes style changes and restores a reset style', () => {
    const store = useDocumentStore()
    const node = store.doc.root.children[0]

    store.updateNodeStyle(node.id, { shape: 'ellipse', lineStyle: 'dashed' })
    store.undo()
    expect(findNode(store.doc.root, node.id)?.style).toBeUndefined()

    store.updateNodeStyle(node.id, { shape: 'rect' })
    store.resetNodeStyle(node.id)
    expect(findNode(store.doc.root, node.id)?.style).toBeUndefined()

    store.undo()
    expect(findNode(store.doc.root, node.id)?.style?.shape).toBe('rect')
  })

  it('loads a workbook and resets editing state and history', () => {
    const store = useDocumentStore()
    store.rename(store.doc.root.id, 'changed')
    expect(store.revision).toBeGreaterThan(0)

    const next = createBlankSheet('Loaded')
    next.root.children.push(createTopic('child'))
    store.loadWorkbook(createWorkbookFromSheet(next))

    expect(store.doc).toStrictEqual(next)
    expect(store.selectedNodeId).toBe(next.root.id)
    expect(store.editingNodeId).toBeNull()
    expect(store.historyFor(next.id).undo).toHaveLength(0)
    expect(store.historyFor(next.id).redo).toHaveLength(0)
    expect(store.revision).toBe(0)
  })

  it('increments the revision for edits and history steps', () => {
    const store = useDocumentStore()
    const initial = store.revision

    store.rename(store.doc.root.id, 'changed')
    expect(store.revision).toBe(initial + 1)

    store.undo()
    expect(store.revision).toBe(initial + 2)

    store.redo()
    expect(store.revision).toBe(initial + 3)
  })

  it('keeps at most 100 history entries', () => {
    const store = useDocumentStore()

    for (let index = 0; index < 105; index += 1) {
      store.mutate((draft) => {
        draft.title = `标题 ${index}`
      })
    }

    expect(store.historyFor(store.activeSheetId).undo).toHaveLength(100)
  })

  it('adds, switches, renames, duplicates and removes sheets', () => {
    const store = useDocumentStore()
    const firstId = store.activeSheetId

    const secondId = store.addSheet()
    expect(store.sheets).toHaveLength(2)
    expect(store.activeSheetId).toBe(secondId)
    expect(store.doc.root.title).toBe('中心主题')

    store.renameSheet(secondId, '计划')
    expect(store.findSheet(secondId)?.title).toBe('计划')

    const copyId = store.duplicateSheet(secondId)
    expect(copyId).toBeTruthy()
    expect(store.sheets).toHaveLength(3)
    expect(store.activeSheetId).toBe(copyId)

    expect(store.removeSheet(copyId as string)).toBe(true)
    expect(store.sheets).toHaveLength(2)
    expect(store.activeSheetId).toBe(secondId)

    expect(store.removeSheet(secondId)).toBe(true)
    expect(store.activeSheetId).toBe(firstId)

    expect(store.removeSheet(firstId)).toBe(false)
    expect(store.sheets).toHaveLength(1)
  })

  it('keeps undo history isolated per sheet', () => {
    const store = useDocumentStore()
    store.mutate((draft) => {
      draft.root.children = []
    })
    store.select(store.doc.root.id)
    store.addChildTo()
    const firstId = store.activeSheetId
    expect(store.canUndo).toBe(true)

    const secondId = store.addSheet()
    expect(store.canUndo).toBe(false)

    store.mutate((draft) => {
      draft.root.children = []
    })
    store.select(store.doc.root.id)
    store.addChildTo()
    expect(store.doc.root.children).toHaveLength(1)

    store.switchSheet(firstId)
    expect(store.doc.root.children).toHaveLength(1)
    expect(store.canUndo).toBe(true)

    store.undo()
    expect(store.doc.root.children).toHaveLength(0)

    store.switchSheet(secondId)
    expect(store.doc.root.children).toHaveLength(1)
  })

  it('moves a sheet to a new index', () => {
    const store = useDocumentStore()
    const firstId = store.activeSheetId
    const secondId = store.addSheet()
    const thirdId = store.addSheet()

    expect(store.moveSheet(thirdId, 0)).toBe(true)
    expect(store.sheets.map((sheet) => sheet.id)).toEqual([thirdId, firstId, secondId])
  })
})

describe('document markers', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('adds, replaces and removes markers per category', () => {
    const store = useDocumentStore()
    const nodeId = store.doc.root.id

    store.toggleMarker(nodeId, { type: 'priority', color: 'red', value: '1' })
    expect(store.doc.root.markers).toEqual([{ type: 'priority', color: 'red', value: '1' }])

    store.toggleMarker(nodeId, { type: 'priority', color: 'blue', value: '2' })
    expect(store.doc.root.markers).toEqual([{ type: 'priority', color: 'blue', value: '2' }])

    store.toggleMarker(nodeId, { type: 'flag', color: 'red' })
    expect(store.doc.root.markers).toHaveLength(2)

    store.removeMarker(nodeId, 'flag')
    expect(store.doc.root.markers).toEqual([{ type: 'priority', color: 'blue', value: '2' }])

    store.clearMarkers(nodeId)
    expect(store.doc.root.markers).toBeUndefined()
  })

  it('undoes and redoes marker changes', () => {
    const store = useDocumentStore()
    const nodeId = store.doc.root.id

    store.toggleMarker(nodeId, { type: 'progress', value: '50' })
    expect(store.doc.root.markers).toEqual([{ type: 'progress', value: '50' }])

    store.undo()
    expect(store.doc.root.markers).toBeUndefined()

    store.redo()
    expect(store.doc.root.markers).toEqual([{ type: 'progress', value: '50' }])
  })
})
