// @vitest-environment node

import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import { createBlankDocument, createTopic } from '@/domain/model/document'
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

  it('loads a document and resets editing state and history', () => {
    const store = useDocumentStore()
    store.rename(store.doc.root.id, 'changed')
    expect(store.revision).toBeGreaterThan(0)

    const next = createBlankDocument('Loaded')
    next.root.children.push(createTopic('child'))
    store.loadDocument(next)

    expect(store.doc).toStrictEqual(next)
    expect(store.selectedNodeId).toBe(next.root.id)
    expect(store.editingNodeId).toBeNull()
    expect(store.undoStack).toHaveLength(0)
    expect(store.redoStack).toHaveLength(0)
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

    expect(store.undoStack).toHaveLength(100)
  })
})
