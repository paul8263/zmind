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
import {
  createBlankSheet,
  createDemoSheet,
  createId,
  createTopic,
  createWorkbookFromSheet,
} from '@/domain/model/document'
import { findNode, isDescendant } from '@/domain/model/tree'
import type {
  Marker,
  MarkerType,
  MindMapSheet,
  MindMapWorkbook,
  NodeStyle,
  Structure,
  TopicNode,
} from '@/domain/model/types'
import { toggleMarkerInList } from '@/domain/markers/catalog'
import { translate } from '@/i18n'

import { useUiStore } from './ui'

type SheetMutator = (draft: Draft<MindMapSheet>) => void

interface HistoryEntry {
  patches: Patch[]
  inverse: Patch[]
}

interface SheetHistory {
  undo: HistoryEntry[]
  redo: HistoryEntry[]
}

const HISTORY_LIMIT = 100

function initialWorkbook(): MindMapWorkbook {
  return createWorkbookFromSheet(createDemoSheet(useUiStore().locale))
}

function newHistory(): SheetHistory {
  return { undo: [], redo: [] }
}

export const useDocumentStore = defineStore('document', {
  state: () => {
    const workbook = initialWorkbook()
    const activeSheet = workbook.sheets[0]

    return {
      workbook,
      activeSheetId: workbook.activeSheetId,
      selectedNodeId: activeSheet.root.id as string | null,
      editingNodeId: null as string | null,
      editingSource: 'canvas' as 'canvas' | 'outline',
      selectionBySheet: {
        [activeSheet.id]: activeSheet.root.id,
      } as Record<string, string | null>,
      historyBySheet: {} as Record<string, SheetHistory>,
      revision: 0,
    }
  },
  getters: {
    doc(state): MindMapSheet {
      return (
        state.workbook.sheets.find((sheet) => sheet.id === state.activeSheetId) ??
        state.workbook.sheets[0]
      )
    },
    sheets(state): MindMapSheet[] {
      return state.workbook.sheets
    },
    selectedNode(): TopicNode | null {
      return this.selectedNodeId ? findNode(this.doc.root, this.selectedNodeId) : null
    },
    canUndo(state): boolean {
      return (state.historyBySheet[state.activeSheetId]?.undo.length ?? 0) > 0
    },
    canRedo(state): boolean {
      return (state.historyBySheet[state.activeSheetId]?.redo.length ?? 0) > 0
    },
  },
  actions: {
    findSheet(id: string): MindMapSheet | undefined {
      return this.workbook.sheets.find((sheet) => sheet.id === id)
    },
    historyFor(id: string): SheetHistory {
      let history = this.historyBySheet[id]
      if (!history) {
        history = newHistory()
        this.historyBySheet[id] = history
      }
      return history
    },
    replaceSheet(id: string, sheet: MindMapSheet) {
      this.workbook.sheets = this.workbook.sheets.map((item) => (item.id === id ? sheet : item))
    },
    mutate(fn: SheetMutator): boolean {
      const sheet = this.doc
      const [next, patches, inverse] = produceWithPatches(toRaw(sheet), fn)
      if (patches.length === 0) return false

      const now = new Date().toISOString()
      this.replaceSheet(
        sheet.id,
        produce(next, (draft) => {
          draft.updatedAt = now
        }),
      )
      this.workbook.updatedAt = now

      const history = this.historyFor(sheet.id)
      history.undo.push(markRaw({ patches, inverse }))
      if (history.undo.length > HISTORY_LIMIT) history.undo.shift()
      history.redo = []
      this.revision += 1
      return true
    },
    undo() {
      const sheet = this.doc
      const history = this.historyFor(sheet.id)
      const entry = history.undo.pop()
      if (!entry) return

      const now = new Date().toISOString()
      this.replaceSheet(
        sheet.id,
        produce(applyPatches(toRaw(sheet), entry.inverse), (draft) => {
          draft.updatedAt = now
        }),
      )
      this.workbook.updatedAt = now
      history.redo.push(entry)
      this.revision += 1
      this.afterHistoryStep()
    },
    redo() {
      const sheet = this.doc
      const history = this.historyFor(sheet.id)
      const entry = history.redo.pop()
      if (!entry) return

      const now = new Date().toISOString()
      this.replaceSheet(
        sheet.id,
        produce(applyPatches(toRaw(sheet), entry.patches), (draft) => {
          draft.updatedAt = now
        }),
      )
      this.workbook.updatedAt = now
      history.undo.push(entry)
      this.revision += 1
      this.afterHistoryStep()
    },
    loadWorkbook(workbook: MindMapWorkbook) {
      this.workbook = workbook
      const active = workbook.sheets.find((sheet) => sheet.id === workbook.activeSheetId)
      this.activeSheetId = active?.id ?? workbook.sheets[0].id
      this.workbook.activeSheetId = this.activeSheetId
      this.selectedNodeId = this.doc.root.id
      this.editingNodeId = null
      this.selectionBySheet = { [this.activeSheetId]: this.selectedNodeId }
      this.historyBySheet = {}
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
    toggleMarker(nodeId: string, marker: Marker) {
      this.mutate((draft) => {
        const node = findNode(draft.root, nodeId)
        if (!node) return

        const next = toggleMarkerInList(node.markers ?? [], marker)
        if (next.length > 0) node.markers = next
        else delete node.markers
      })
    },
    removeMarker(nodeId: string, type: MarkerType) {
      this.mutate((draft) => {
        const node = findNode(draft.root, nodeId)
        if (!node) return

        const next = (node.markers ?? []).filter((marker) => marker.type !== type)
        if (next.length > 0) node.markers = next
        else delete node.markers
      })
    },
    clearMarkers(nodeId: string) {
      this.mutate((draft) => {
        const node = findNode(draft.root, nodeId)
        if (node?.markers?.length) delete node.markers
      })
    },
    defaultSheetTitle(index: number): string {
      return translate(useUiStore().locale, 'sheet.defaultName', { index })
    },
    addSheet(): string {
      const locale = useUiStore().locale
      const sheet = createBlankSheet(
        this.defaultSheetTitle(this.workbook.sheets.length + 1),
        translate(locale, 'file.centralTopic'),
      )

      this.workbook.sheets.push(sheet)
      this.workbook.updatedAt = new Date().toISOString()
      this.switchSheet(sheet.id)
      this.revision += 1
      return sheet.id
    },
    addSheetFrom(sheet: MindMapSheet): string {
      const next = this.findSheet(sheet.id) ? { ...sheet, id: createId('sheet') } : sheet

      this.workbook.sheets.push(next)
      this.workbook.updatedAt = new Date().toISOString()
      this.switchSheet(next.id)
      this.revision += 1
      return next.id
    },
    switchSheet(id: string) {
      if (id === this.activeSheetId) return

      const target = this.findSheet(id)
      if (!target) return

      this.selectionBySheet[this.activeSheetId] = this.selectedNodeId
      this.activeSheetId = id
      this.workbook.activeSheetId = id
      const remembered = this.selectionBySheet[id]
      this.selectedNodeId =
        remembered && findNode(target.root, remembered) ? remembered : target.root.id
      this.editingNodeId = null
    },
    renameSheet(id: string, title: string) {
      const sheet = this.findSheet(id)
      if (!sheet) return

      const index = this.workbook.sheets.findIndex((item) => item.id === id)
      const nextTitle = title.trim() || this.defaultSheetTitle(index + 1)
      if (sheet.title === nextTitle) return

      sheet.title = nextTitle
      this.workbook.updatedAt = new Date().toISOString()
      this.revision += 1
    },
    duplicateSheet(id: string): string | null {
      const sheet = this.findSheet(id)
      if (!sheet) return null

      const index = this.workbook.sheets.findIndex((item) => item.id === id)
      const copy: MindMapSheet = JSON.parse(JSON.stringify(toRaw(sheet)))
      copy.id = createId('sheet')
      copy.title = translate(useUiStore().locale, 'sheet.copyTitle', { name: sheet.title })

      this.workbook.sheets.splice(index + 1, 0, copy)
      this.workbook.updatedAt = new Date().toISOString()
      this.switchSheet(copy.id)
      this.revision += 1
      return copy.id
    },
    removeSheet(id: string): boolean {
      if (this.workbook.sheets.length <= 1) return false

      const index = this.workbook.sheets.findIndex((sheet) => sheet.id === id)
      if (index < 0) return false

      this.workbook.sheets.splice(index, 1)
      delete this.historyBySheet[id]
      delete this.selectionBySheet[id]

      if (this.activeSheetId === id) {
        const next = this.workbook.sheets[Math.min(index, this.workbook.sheets.length - 1)]
        this.activeSheetId = next.id
        this.workbook.activeSheetId = next.id
        const remembered = this.selectionBySheet[next.id]
        this.selectedNodeId =
          remembered && findNode(next.root, remembered) ? remembered : next.root.id
        this.editingNodeId = null
      }

      this.workbook.updatedAt = new Date().toISOString()
      this.revision += 1
      return true
    },
    moveSheet(id: string, index: number): boolean {
      const from = this.workbook.sheets.findIndex((sheet) => sheet.id === id)
      if (from < 0) return false

      const target = Math.max(0, Math.min(index, this.workbook.sheets.length - 1))
      if (from === target) return false

      const [sheet] = this.workbook.sheets.splice(from, 1)
      this.workbook.sheets.splice(target, 0, sheet)
      this.workbook.updatedAt = new Date().toISOString()
      this.revision += 1
      return true
    },
  },
})
