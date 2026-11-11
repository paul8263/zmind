// @vitest-environment node

import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createBlankDocument } from '@/domain/model/document'
import * as bridge from '@/lib/fileBridge'

import { useDocumentStore } from './document'
import { useFileStore } from './file'

vi.mock('@/lib/fileBridge', () => ({
  isDesktop: vi.fn(() => true),
  openFileDialog: vi.fn(),
  saveFileDialog: vi.fn(),
  readDocumentFile: vi.fn(),
  writeDocumentFile: vi.fn(),
  readRecovery: vi.fn(),
  writeRecovery: vi.fn(),
  clearRecovery: vi.fn(),
  takePendingOpenFile: vi.fn(),
  setMenuLocale: vi.fn(),
}))

const mocked = {
  isDesktop: vi.mocked(bridge.isDesktop),
  openFileDialog: vi.mocked(bridge.openFileDialog),
  saveFileDialog: vi.mocked(bridge.saveFileDialog),
  readDocumentFile: vi.mocked(bridge.readDocumentFile),
  writeDocumentFile: vi.mocked(bridge.writeDocumentFile),
  readRecovery: vi.mocked(bridge.readRecovery),
  writeRecovery: vi.mocked(bridge.writeRecovery),
  clearRecovery: vi.mocked(bridge.clearRecovery),
  takePendingOpenFile: vi.mocked(bridge.takePendingOpenFile),
}

describe('file store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mocked.isDesktop.mockReturnValue(true)
    mocked.openFileDialog.mockResolvedValue(null)
    mocked.saveFileDialog.mockResolvedValue(null)
    mocked.readDocumentFile.mockResolvedValue('')
    mocked.writeDocumentFile.mockResolvedValue(undefined)
    mocked.readRecovery.mockResolvedValue(null)
    mocked.writeRecovery.mockResolvedValue(undefined)
    mocked.clearRecovery.mockResolvedValue(undefined)
    mocked.takePendingOpenFile.mockResolvedValue(null)
  })

  afterEach(() => {
    useFileStore().stopTracking()
  })

  it('loads a document and records it in recent files', () => {
    const fileStore = useFileStore()
    const doc = createBlankDocument('Saved map')

    fileStore.startTracking()
    fileStore.loadDocument(doc, 'C:\\maps\\saved.zmind')

    expect(fileStore.path).toBe('C:\\maps\\saved.zmind')
    expect(fileStore.displayName).toBe('saved')
    expect(fileStore.isDirty).toBe(false)
    expect(fileStore.recentFiles[0]).toMatchObject({
      path: 'C:\\maps\\saved.zmind',
      name: 'saved',
    })
  })

  it('tracks dirty state and clears it when undoing back to the saved version', () => {
    const fileStore = useFileStore()
    const docStore = useDocumentStore()

    fileStore.startTracking()
    docStore.rename(docStore.doc.root.id, 'changed')
    expect(fileStore.isDirty).toBe(true)

    docStore.undo()
    expect(fileStore.isDirty).toBe(false)
  })

  it('saves to the current path and clears recovery data', async () => {
    const fileStore = useFileStore()
    const docStore = useDocumentStore()
    const doc = createBlankDocument('Saved map')

    fileStore.loadDocument(doc, 'C:\\maps\\saved.zmind')
    fileStore.startTracking()
    mocked.clearRecovery.mockClear()
    docStore.rename(doc.root.id, 'changed')

    await expect(fileStore.save()).resolves.toBe(true)

    expect(mocked.writeDocumentFile).toHaveBeenCalledWith(
      'C:\\maps\\saved.zmind',
      expect.stringContaining('"changed"'),
    )
    expect(fileStore.isDirty).toBe(false)
    expect(mocked.clearRecovery).toHaveBeenCalled()
  })

  it('saves as with a zmind extension when no path exists', async () => {
    const fileStore = useFileStore()
    const doc = createBlankDocument('New map')

    fileStore.loadDocument(doc, null)
    mocked.saveFileDialog.mockResolvedValue('C:\\maps\\new-map')

    await expect(fileStore.save()).resolves.toBe(true)

    expect(mocked.writeDocumentFile).toHaveBeenCalledWith(
      'C:\\maps\\new-map.zmind',
      expect.any(String),
    )
    expect(fileStore.path).toBe('C:\\maps\\new-map.zmind')
  })

  it('opens a valid document and rejects invalid JSON', async () => {
    const fileStore = useFileStore()
    const doc = createBlankDocument('Loaded map')

    mocked.readDocumentFile.mockResolvedValueOnce(JSON.stringify(doc))
    await expect(fileStore.openPathNow('C:\\maps\\loaded.zmind')).resolves.toBe(true)
    expect(fileStore.displayName).toBe('loaded')
    expect(fileStore.recentFiles[0]?.name).toBe('loaded')

    mocked.readDocumentFile.mockResolvedValueOnce('not json')
    await expect(fileStore.openPathNow('C:\\maps\\bad.zmind')).resolves.toBe(false)
    expect(fileStore.errorKey).toBe('file.errorInvalid')
  })

  it('guards unsaved changes before creating a new document', () => {
    const fileStore = useFileStore()
    const docStore = useDocumentStore()

    fileStore.startTracking()
    docStore.rename(docStore.doc.root.id, 'changed')
    fileStore.requestNew()

    expect(fileStore.unsavedOpen).toBe(true)
    expect(fileStore.pendingAction).toBe('new')

    fileStore.discardAndContinue()

    expect(fileStore.unsavedOpen).toBe(false)
    expect(fileStore.isDirty).toBe(false)
    expect(docStore.doc.title).toBe('未命名脑图')
  })

  it('guards unsaved changes before loading imported content', () => {
    const fileStore = useFileStore()
    const docStore = useDocumentStore()
    const imported = createBlankDocument('Imported map')

    fileStore.startTracking()
    docStore.rename(docStore.doc.root.id, 'changed')
    fileStore.requestLoadDocument(imported)

    expect(fileStore.unsavedOpen).toBe(true)
    expect(fileStore.pendingAction).toBe('replace-doc')
    expect(fileStore.pendingName).toBe('Imported map')

    fileStore.discardAndContinue()

    expect(docStore.doc.title).toBe('Imported map')
    expect(fileStore.path).toBeNull()
    expect(fileStore.isDirty).toBe(true)
    expect(fileStore.unsavedOpen).toBe(false)
  })

  it('loads imported content directly when the current document is clean', () => {
    const fileStore = useFileStore()
    const docStore = useDocumentStore()
    const imported = createBlankDocument('Imported map')

    fileStore.startTracking()
    fileStore.requestLoadDocument(imported)

    expect(fileStore.unsavedOpen).toBe(false)
    expect(docStore.doc.title).toBe('Imported map')
    expect(fileStore.path).toBeNull()
    expect(fileStore.isDirty).toBe(true)
  })

  it('offers and restores a recovery snapshot', async () => {
    const fileStore = useFileStore()
    const docStore = useDocumentStore()
    const recovered = createBlankDocument('Recovered map')
    const savedAt = new Date().toISOString()

    fileStore.startTracking()
    mocked.readRecovery.mockResolvedValueOnce(
      JSON.stringify({
        path: 'C:\\maps\\recovered.zmind',
        savedAt,
        document: recovered,
      }),
    )

    await fileStore.initialize()

    expect(fileStore.recoveryOpen).toBe(true)
    expect(fileStore.recoveryName).toBe('recovered')
    expect(fileStore.recoveryTime).not.toBe('')

    fileStore.restoreRecovery()

    expect(docStore.doc.title).toBe('Recovered map')
    expect(fileStore.path).toBe('C:\\maps\\recovered.zmind')
    expect(fileStore.isDirty).toBe(true)
    expect(fileStore.recoveryOpen).toBe(false)
  })

  it('writes a recovery snapshot for unsaved edits', async () => {
    const fileStore = useFileStore()
    const docStore = useDocumentStore()

    fileStore.startTracking()
    docStore.rename(docStore.doc.root.id, 'changed')
    await fileStore.writeRecoverySnapshot()

    expect(mocked.writeRecovery).toHaveBeenCalledTimes(1)
    const payload = JSON.parse(mocked.writeRecovery.mock.calls[0][0])
    expect(payload.document.root.title).toBe('changed')
    expect(typeof payload.savedAt).toBe('string')
  })

  it('keeps recent files unique and capped', () => {
    const fileStore = useFileStore()

    for (let index = 0; index < 10; index += 1) {
      fileStore.addRecent(`C:\\maps\\${index}.zmind`)
    }
    expect(fileStore.recentFiles).toHaveLength(8)

    fileStore.addRecent('C:\\maps\\5.zmind')
    expect(fileStore.recentFiles).toHaveLength(8)
    expect(fileStore.recentFiles[0]?.name).toBe('5')
  })
})
