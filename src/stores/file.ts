import { defineStore } from 'pinia'
import { watch } from 'vue'

import {
  createBlankWorkbook,
  createDemoSheet,
  createWorkbookFromSheet,
} from '@/domain/model/document'
import { safeParseWorkbook } from '@/domain/model/schema'
import type { MindMapWorkbook } from '@/domain/model/types'
import { translate } from '@/i18n'
import type { MessageKey } from '@/i18n/messages'
import {
  clearRecovery,
  isDesktop,
  openFileDialog,
  readDocumentFile,
  readRecovery,
  saveFileDialog,
  takePendingOpenFile,
  writeDocumentFile,
  writeRecovery,
} from '@/lib/fileBridge'

import { useDocumentStore } from './document'
import { useUiStore } from './ui'

const RECENT_STORAGE_KEY = 'zmind.recentFiles'
const RECENT_LIMIT = 8
const AUTOSAVE_DELAY = 800

export interface RecentFile {
  path: string
  name: string
  openedAt: string
}

export interface RecoverySnapshot {
  path: string | null
  savedAt: string
  workbook: MindMapWorkbook
}

type PendingAction = 'new' | 'open' | 'open-path' | 'exit' | 'replace-workbook'

let stopDirtyWatch: (() => void) | undefined
let stopAutosaveWatch: (() => void) | undefined
let autosaveTimer: ReturnType<typeof setTimeout> | undefined

function disposeWatchers() {
  stopDirtyWatch?.()
  stopDirtyWatch = undefined
  stopAutosaveWatch?.()
  stopAutosaveWatch = undefined
  if (autosaveTimer) {
    clearTimeout(autosaveTimer)
    autosaveTimer = undefined
  }
}

function fileStem(path: string): string {
  const name = path.split(/[\\/]/).pop() ?? path
  return name.replace(/\.zmind$/i, '') || name
}

function ensureZmindExtension(path: string): string {
  return /\.zmind$/i.test(path) ? path : `${path}.zmind`
}

function safeFileTitle(title: string, fallback: string): string {
  const cleaned = title.replace(/[\\/:*?"<>|]/g, '_').trim()
  return cleaned || fallback
}

function serializeWorkbook(workbook: MindMapWorkbook, pretty = false): string {
  return pretty ? JSON.stringify(workbook, null, 2) : JSON.stringify(workbook)
}

function workbookFingerprint(workbook: MindMapWorkbook): string {
  return JSON.stringify(workbook, (key, value) =>
    key === 'updatedAt' || key === 'activeSheetId' ? undefined : value,
  )
}

function parseWorkbookText(text: string): MindMapWorkbook | null {
  try {
    const parsed = safeParseWorkbook(JSON.parse(text))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

function parseRecovery(text: string): RecoverySnapshot | null {
  try {
    const data = JSON.parse(text) as {
      path?: unknown
      savedAt?: unknown
      workbook?: unknown
      document?: unknown
    }
    if (typeof data.savedAt !== 'string') return null

    const parsed = safeParseWorkbook(data.workbook ?? data.document)
    if (!parsed.success) return null

    return {
      path: typeof data.path === 'string' ? data.path : null,
      savedAt: data.savedAt,
      workbook: parsed.data,
    }
  } catch {
    return null
  }
}

function readRecentFiles(): RecentFile[] {
  if (typeof localStorage === 'undefined') return []

  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_STORAGE_KEY) ?? '[]')
    if (!Array.isArray(parsed)) return []

    return parsed
      .filter(
        (item): item is RecentFile =>
          Boolean(item) &&
          typeof item.path === 'string' &&
          typeof item.name === 'string' &&
          typeof item.openedAt === 'string',
      )
      .slice(0, RECENT_LIMIT)
  } catch {
    return []
  }
}

function persistRecentFiles(files: RecentFile[]) {
  if (typeof localStorage === 'undefined') return

  try {
    localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(files))
  } catch {
    // Recent files are a convenience; the app still works without storage access.
  }
}

function errorDetail(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return error ? String(error) : ''
}

function formatDateTime(value: string, locale: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString(locale === 'en' ? 'en-US' : 'zh-CN')
}

export const useFileStore = defineStore('file', {
  state: () => ({
    path: null as string | null,
    savedSnapshot: '',
    dirty: false,
    busy: false,
    recentFiles: readRecentFiles(),
    errorKey: null as MessageKey | null,
    errorDetail: '',
    unsavedOpen: false,
    pendingAction: null as PendingAction | null,
    pendingOpenPath: null as string | null,
    pendingWorkbook: null as MindMapWorkbook | null,
    recovery: null as RecoverySnapshot | null,
    recoveryOpen: false,
    exitRequested: false,
  }),
  getters: {
    isDirty: (state) => state.dirty,
    displayName(state): string {
      return state.path ? fileStem(state.path) : useDocumentStore().workbook.title
    },
    defaultSavePath(state): string {
      if (state.path) return state.path
      const locale = useUiStore().locale
      const title = useDocumentStore().workbook.title
      return `${safeFileTitle(title, translate(locale, 'file.untitledName'))}.zmind`
    },
    pendingName(state): string {
      if (state.pendingWorkbook) return state.pendingWorkbook.title
      if (state.pendingOpenPath) return fileStem(state.pendingOpenPath)
      return state.path ? fileStem(state.path) : useDocumentStore().workbook.title
    },
    recoveryName(state): string {
      if (!state.recovery) return ''
      return state.recovery.path ? fileStem(state.recovery.path) : state.recovery.workbook.title
    },
    recoveryTime(state): string {
      if (!state.recovery) return ''
      return formatDateTime(state.recovery.savedAt, useUiStore().locale)
    },
    hasError: (state) => Boolean(state.errorKey),
  },
  actions: {
    startTracking() {
      disposeWatchers()
      const docStore = useDocumentStore()
      this.savedSnapshot = workbookFingerprint(docStore.workbook)
      this.dirty = false

      stopDirtyWatch = watch(
        () => docStore.revision,
        () => {
          this.dirty = workbookFingerprint(docStore.workbook) !== this.savedSnapshot
        },
        { flush: 'sync' },
      )

      stopAutosaveWatch = watch(
        () => docStore.revision,
        () => {
          if (!this.dirty) return
          if (autosaveTimer) clearTimeout(autosaveTimer)
          autosaveTimer = setTimeout(() => {
            autosaveTimer = undefined
            void this.writeRecoverySnapshot()
          }, AUTOSAVE_DELAY)
        },
      )
    },
    stopTracking() {
      disposeWatchers()
    },
    async initialize() {
      if (!isDesktop()) return

      const pendingPath = await takePendingOpenFile().catch(() => null)
      if (pendingPath) {
        await this.openPathNow(pendingPath)
        return
      }

      const raw = await readRecovery().catch(() => null)
      if (!raw) return

      const snapshot = parseRecovery(raw)
      if (!snapshot) {
        await clearRecovery().catch(() => undefined)
        return
      }

      this.recovery = snapshot
      this.recoveryOpen = true
    },
    markClean() {
      this.savedSnapshot = workbookFingerprint(useDocumentStore().workbook)
      this.dirty = false
    },
    loadWorkbook(workbook: MindMapWorkbook, path: string | null) {
      useDocumentStore().loadWorkbook(workbook)
      this.path = path
      this.markClean()
      this.recovery = null
      this.recoveryOpen = false
      if (path) this.addRecent(path)
      void clearRecovery().catch(() => undefined)
    },
    newNow() {
      const locale = useUiStore().locale
      const workbook = createBlankWorkbook(
        translate(locale, 'file.untitled'),
        translate(locale, 'sheet.defaultName', { index: 1 }),
        translate(locale, 'file.centralTopic'),
      )
      this.loadWorkbook(workbook, null)
    },
    loadExample() {
      this.requestLoadWorkbook(createWorkbookFromSheet(createDemoSheet(useUiStore().locale)))
    },
    loadExternalWorkbook(workbook: MindMapWorkbook) {
      useDocumentStore().loadWorkbook(workbook)
      this.path = null
      this.savedSnapshot = workbookFingerprint(workbook)
      this.dirty = true
      this.recovery = null
      this.recoveryOpen = false
      void clearRecovery().catch(() => undefined)
    },
    requestLoadWorkbook(workbook: MindMapWorkbook) {
      if (this.dirty) {
        this.pendingAction = 'replace-workbook'
        this.pendingOpenPath = null
        this.pendingWorkbook = workbook
        this.unsavedOpen = true
        return
      }
      this.loadExternalWorkbook(workbook)
    },
    requestNew() {
      if (this.dirty) {
        this.pendingAction = 'new'
        this.pendingOpenPath = null
        this.pendingWorkbook = null
        this.unsavedOpen = true
        return
      }
      this.newNow()
    },
    async openDialogNow() {
      if (!isDesktop()) {
        this.setError('file.errorDesktopOnly')
        return
      }

      const locale = useUiStore().locale
      try {
        const selected = await openFileDialog({
          title: translate(locale, 'file.openDialogTitle'),
          filterName: translate(locale, 'file.filterName'),
        })
        if (selected) await this.openPathNow(selected)
      } catch (error) {
        this.setError('file.errorOpen', error)
      }
    },
    requestOpenDialog() {
      if (this.dirty) {
        this.pendingAction = 'open'
        this.pendingOpenPath = null
        this.pendingWorkbook = null
        this.unsavedOpen = true
        return
      }
      void this.openDialogNow()
    },
    async openPathNow(path: string): Promise<boolean> {
      this.busy = true
      try {
        const contents = await readDocumentFile(path)
        const workbook = parseWorkbookText(contents)
        if (!workbook) {
          this.setError('file.errorInvalid')
          return false
        }

        this.loadWorkbook(workbook, path)
        return true
      } catch (error) {
        this.setError('file.errorOpen', error)
        return false
      } finally {
        this.busy = false
      }
    },
    requestOpenPath(path: string) {
      if (this.dirty) {
        this.pendingAction = 'open-path'
        this.pendingOpenPath = path
        this.pendingWorkbook = null
        this.unsavedOpen = true
        return
      }
      void this.openPathNow(path)
    },
    async save(): Promise<boolean> {
      if (!isDesktop()) {
        this.setError('file.errorDesktopOnly')
        return false
      }
      if (!this.path) return this.saveAs()
      return this.writeTo(this.path)
    },
    async saveAs(): Promise<boolean> {
      if (!isDesktop()) {
        this.setError('file.errorDesktopOnly')
        return false
      }

      const locale = useUiStore().locale
      try {
        const selected = await saveFileDialog({
          title: translate(locale, 'file.saveDialogTitle'),
          filterName: translate(locale, 'file.filterName'),
          defaultPath: this.defaultSavePath,
        })
        if (!selected) return false
        return this.writeTo(ensureZmindExtension(selected))
      } catch (error) {
        this.setError('file.errorSave', error)
        return false
      }
    },
    async writeTo(path: string): Promise<boolean> {
      this.busy = true
      try {
        const contents = serializeWorkbook(useDocumentStore().workbook, true)
        await writeDocumentFile(path, contents)
        this.path = path
        this.markClean()
        this.addRecent(path)
        this.recovery = null
        this.recoveryOpen = false
        await clearRecovery().catch(() => undefined)
        return true
      } catch (error) {
        this.setError('file.errorSave', error)
        return false
      } finally {
        this.busy = false
      }
    },
    requestExit() {
      if (this.dirty) {
        this.pendingAction = 'exit'
        this.pendingOpenPath = null
        this.pendingWorkbook = null
        this.unsavedOpen = true
        return
      }
      this.exitRequested = true
    },
    async saveAndContinue() {
      if (await this.save()) this.executePending()
    },
    discardAndContinue() {
      void clearRecovery().catch(() => undefined)
      this.executePending()
    },
    executePending() {
      const action = this.pendingAction
      const path = this.pendingOpenPath
      const workbook = this.pendingWorkbook
      this.unsavedOpen = false
      this.pendingAction = null
      this.pendingOpenPath = null
      this.pendingWorkbook = null

      if (action === 'new') this.newNow()
      else if (action === 'open') void this.openDialogNow()
      else if (action === 'open-path' && path) void this.openPathNow(path)
      else if (action === 'replace-workbook' && workbook) this.loadExternalWorkbook(workbook)
      else if (action === 'exit') this.exitRequested = true
    },
    cancelPending() {
      this.unsavedOpen = false
      this.pendingAction = null
      this.pendingOpenPath = null
      this.pendingWorkbook = null
    },
    resetExitRequest() {
      this.exitRequested = false
    },
    restoreRecovery() {
      if (!this.recovery) return
      const snapshot = this.recovery
      useDocumentStore().loadWorkbook(snapshot.workbook)
      this.path = snapshot.path
      this.savedSnapshot = workbookFingerprint(snapshot.workbook)
      this.dirty = true
      this.recovery = null
      this.recoveryOpen = false
    },
    discardRecovery() {
      this.recovery = null
      this.recoveryOpen = false
      void clearRecovery().catch(() => undefined)
    },
    async writeRecoverySnapshot() {
      if (!isDesktop() || !this.dirty) return

      const payload = JSON.stringify({
        path: this.path,
        savedAt: new Date().toISOString(),
        workbook: useDocumentStore().workbook,
      })

      try {
        await writeRecovery(payload)
      } catch {
        // Autosave failures should never interrupt editing; the next edit retries.
      }
    },
    addRecent(path: string) {
      const entry: RecentFile = {
        path,
        name: fileStem(path),
        openedAt: new Date().toISOString(),
      }
      this.recentFiles = [entry, ...this.recentFiles.filter((item) => item.path !== path)].slice(
        0,
        RECENT_LIMIT,
      )
      persistRecentFiles(this.recentFiles)
    },
    removeRecent(path: string) {
      this.recentFiles = this.recentFiles.filter((item) => item.path !== path)
      persistRecentFiles(this.recentFiles)
    },
    clearRecent() {
      this.recentFiles = []
      persistRecentFiles(this.recentFiles)
    },
    setError(key: MessageKey, error?: unknown) {
      this.errorKey = key
      this.errorDetail = errorDetail(error)
    },
    clearError() {
      this.errorKey = null
      this.errorDetail = ''
    },
  },
})
