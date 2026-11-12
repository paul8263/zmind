import {
  applyPatches,
  enablePatches,
  produce,
  produceWithPatches,
  type Draft,
  type Patch,
} from 'immer'
import { defineStore } from 'pinia'
import { markRaw, toRaw } from 'vue'

enablePatches()

import {
  insertChild,
  insertSibling,
  moveNode,
  removeNode,
  renameNode,
  toggleCollapse,
} from '@/domain/commands/tree'
import { createDemoDocument, createTopic } from '@/domain/model/document'
import { findNode, isDescendant } from '@/domain/model/tree'
import type { MindMapDocument, NodeStyle, Structure, TopicNode } from '@/domain/model/types'
import { translate } from '@/i18n'

import { useUiStore } from './ui'

type DocumentMutator = (draft: Draft<MindMapDocument>) => void

interface HistoryEntry {
  patches: Patch[]
  inverse: Patch[]
}

const HISTORY_LIMIT = 100

export const useDocumentStore = defineStore('document', {
  state: () => ({
    doc: createDemoDocument(useUiStore().locale) as MindMapDocument,
    selectedNodeId: null as string | null,
    editingNodeId: null as string | null,
    editingSource: 'canvas' as 'canvas' | 'outline',
    undoStack: [] as HistoryEntry[],
    redoStack: [] as HistoryEntry[],
    revision: 0,
  }),
  getters: {
    selectedNode(state): TopicNode | null {
      return state.selectedNodeId ? findNode(state.doc.root, state.selectedNodeId) : null
    },
    canUndo(state): boolean {
      return state.undoStack.length > 0
    },
    canRedo(state): boolean {
      return state.redoStack.length > 0
    },
  },
  actions: {
    mutate(fn: DocumentMutator): boolean {
      const [next, patches, inverse] = produceWithPatches(toRaw(this.doc), fn)
      if (patches.length === 0) return false

      this.doc = produce(next, (draft) => {
        draft.updatedAt = new Date().toISOString()
      })
      this.undoStack.push(markRaw({ patches, inverse }))
      if (this.undoStack.length > HISTORY_LIMIT) this.undoStack.shift()
      this.redoStack = []
      this.revision += 1
      return true
    },
    undo() {
      const entry = this.undoStack.pop()
      if (!entry) return

      this.doc = produce(applyPatches(toRaw(this.doc), entry.inverse), (draft) => {
        draft.updatedAt = new Date().toISOString()
      })
      this.redoStack.push(entry)
      this.revision += 1
      this.afterHistoryStep()
    },
    redo() {
      const entry = this.redoStack.pop()
      if (!entry) return

      this.doc = produce(applyPatches(toRaw(this.doc), entry.patches), (draft) => {
        draft.updatedAt = new Date().toISOString()
      })
      this.undoStack.push(entry)
      this.revision += 1
      this.afterHistoryStep()
    },
    loadDocument(doc: MindMapDocument) {
      this.doc = doc
      this.selectedNodeId = doc.root.id
      this.editingNodeId = null
      this.undoStack = []
      this.redoStack = []
      this.revision = 0
    },
    afterHistoryStep() {
      this.editingNodeId = null
      if (this.selectedNodeId && !findNode(this.doc.root, this.selectedNodeId)) {
        this.selectedNodeId = this.doc.root.id
      }
    },
    select(id: string | null) {
      this.selectedNodeId = id
      if (this.editingNodeId && this.editingNodeId !== id) {
        this.editingNodeId = null
      }
    },
    clearSelection() {
      this.selectedNodeId = null
      this.editingNodeId = null
    },
    startEditing(id: string, source: 'canvas' | 'outline' = 'canvas') {
      this.selectedNodeId = id
      this.editingNodeId = id
      this.editingSource = source
    },
    stopEditing() {
      this.editingNodeId = null
    },
    addChildTo(parentId?: string, source: 'canvas' | 'outline' = 'canvas') {
      const targetId = parentId ?? this.selectedNodeId ?? this.doc.root.id
      const uiStore = useUiStore()
      const node = createTopic(translate(uiStore.locale, 'topic.new'))
      let inserted = false

      this.mutate((draft) => {
        inserted = insertChild(draft, targetId, node)
      })

      if (inserted) {
        this.selectedNodeId = node.id
        this.editingNodeId = node.id
        this.editingSource = source
      }
    },
    addSiblingTo(nodeId?: string, source: 'canvas' | 'outline' = 'canvas') {
      const targetId = nodeId ?? this.selectedNodeId ?? this.doc.root.id

      if (targetId === this.doc.root.id) {
        this.addChildTo(targetId, source)
        return
      }

      const node = createTopic(translate(useUiStore().locale, 'topic.new'))
      let inserted = false

      this.mutate((draft) => {
        inserted = insertSibling(draft, targetId, node)
      })

      if (inserted) {
        this.selectedNodeId = node.id
        this.editingNodeId = node.id
        this.editingSource = source
      }
    },
    remove(nodeId?: string) {
      const targetId = nodeId ?? this.selectedNodeId
      if (!targetId) return

      let parentId: string | null = null
      this.mutate((draft) => {
        parentId = removeNode(draft, targetId)
      })

      if (parentId) this.selectedNodeId = parentId
      if (this.editingNodeId === targetId) this.editingNodeId = null
    },
    rename(nodeId: string, title: string) {
      const nextTitle = title.trim() || translate(useUiStore().locale, 'topic.untitled')
      this.mutate((draft) => {
        renameNode(draft, nodeId, nextTitle)
      })
      this.editingNodeId = null
    },
    toggle(nodeId: string) {
      this.mutate((draft) => {
        toggleCollapse(draft, nodeId)
      })

      const node = findNode(this.doc.root, nodeId)
      if (
        node?.collapsed &&
        this.selectedNodeId &&
        isDescendant(this.doc.root, nodeId, this.selectedNodeId)
      ) {
        this.selectedNodeId = nodeId
        this.editingNodeId = null
      }
    },
    move(nodeId: string, newParentId: string, index: number) {
      this.mutate((draft) => {
        moveNode(draft, nodeId, newParentId, index)
      })
    },
    setStructure(structure: Structure) {
      if (this.doc.structure === structure) return

      this.mutate((draft) => {
        draft.structure = structure
      })
    },
    setTheme(themeId: string) {
      if (this.doc.themeId === themeId) return

      this.mutate((draft) => {
        draft.themeId = themeId
      })
    },
    updateNodeStyle(nodeId: string, patch: Partial<NodeStyle>) {
      this.mutate((draft) => {
        const node = findNode(draft.root, nodeId)
        if (!node) return

        const next = { ...(node.style ?? {}), ...patch } as NodeStyle
        for (const key of Object.keys(patch) as Array<keyof NodeStyle>) {
          if (patch[key] === undefined) delete next[key]
        }

        if (Object.keys(next).length > 0) node.style = next
        else delete node.style
      })
    },
    resetNodeStyle(nodeId: string) {
      this.mutate((draft) => {
        const node = findNode(draft.root, nodeId)
        if (node) delete node.style
      })
    },
  },
})
