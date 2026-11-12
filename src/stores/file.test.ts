// @vitest-environment node

import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createBlankSheet, createWorkbookFromSheet } from '@/domain/model/document'
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
    const doc = createBlankSheet('Saved map')

    fileStore.startTracking()
    fileStore.loadWorkbook(createWorkbookFromSheet(doc), 'C:\\maps\\saved.zmind')

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
    const doc = createBlankSheet('Saved map')

    fileStore.loadWorkbook(createWorkbookFromSheet(doc), 'C:\\maps\\saved.zmind')
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
    const doc = createBlankSheet('New map')

    fileStore.loadWorkbook(createWorkbookFromSheet(doc), null)
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
    const doc = createBlankSheet('Loaded map')

    mocked.readDocumentFile.mockResolvedValueOnce(JSON.stringify(createWorkbookFromSheet(doc)))
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
    expect(docStore.workbook.title).toBe('未命名脑图')
  })

  it('guards unsaved changes before loading a workbook', () => {
    const fileStore = useFileStore()
    const docStore = useDocumentStore()
    const imported = createWorkbookFromSheet(createBlankSheet('Imported map'))

    fileStore.startTracking()
    docStore.rename(docStore.doc.root.id, 'changed')
    fileStore.requestLoadWorkbook(imported)

    expect(fileStore.unsavedOpen).toBe(true)
    expect(fileStore.pendingAction).toBe('replace-workbook')
    expect(fileStore.pendingName).toBe('Imported map')

    fileStore.discardAndContinue()

    expect(docStore.workbook.title).toBe('Imported map')
    expect(fileStore.path).toBeNull()
    expect(fileStore.isDirty).toBe(true)
    expect(fileStore.unsavedOpen).toBe(false)
  })

  it('loads a workbook directly when the current document is clean', () => {
    const fileStore = useFileStore()
    const docStore = useDocumentStore()
    const imported = createWorkbookFromSheet(createBlankSheet('Imported map'))

    fileStore.startTracking()
    fileStore.requestLoadWorkbook(imported)

    expect(fileStore.unsavedOpen).toBe(false)
    expect(docStore.workbook.title).toBe('Imported map')
    expect(fileStore.path).toBeNull()
    expect(fileStore.isDirty).toBe(true)
  })

  it('offers and restores a recovery snapshot', async () => {
    const fileStore = useFileStore()
    const docStore = useDocumentStore()
    const recovered = createBlankSheet('Recovered map')
    const savedAt = new Date().toISOString()

    fileStore.startTracking()
    mocked.readRecovery.mockResolvedValueOnce(
      JSON.stringify({
        path: 'C:\\maps\\recovered.zmind',
        savedAt,
        workbook: createWorkbookFromSheet(recovered),
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

  it('migrates a legacy version 1 recovery snapshot', async () => {
    const fileStore = useFileStore()
    const docStore = useDocumentStore()
    const sheet = createBlankSheet('Legacy recovered')

    fileStore.startTracking()
    mocked.readRecovery.mockResolvedValueOnce(
      JSON.stringify({
        path: null,
        savedAt: new Date().toISOString(),
        document: { schemaVersion: 1, ...sheet },
      }),
    )

    await fileStore.initialize()
    expect(fileStore.recoveryOpen).toBe(true)

    fileStore.restoreRecovery()

    expect(docStore.sheets).toHaveLength(1)
    expect(docStore.doc.title).toBe('Legacy recovered')
  })

  it('writes a recovery snapshot for unsaved edits', async () => {
    const fileStore = useFileStore()
    const docStore = useDocumentStore()

    fileStore.startTracking()
    docStore.rename(docStore.doc.root.id, 'changed')
    await fileStore.writeRecoverySnapshot()

    expect(mocked.writeRecovery).toHaveBeenCalledTimes(1)
    const payload = JSON.parse(mocked.writeRecovery.mock.calls[0][0])
    expect(payload.workbook.sheets[0].root.title).toBe('changed')
    expect(typeof payload.savedAt).toBe('string')
  })

  it('migrates a version 1 file when opening it', async () => {
    const fileStore = useFileStore()
    const docStore = useDocumentStore()
    const sheet = createBlankSheet('Legacy map')

    mocked.readDocumentFile.mockResolvedValueOnce(JSON.stringify({ schemaVersion: 1, ...sheet }))

    await expect(fileStore.openPathNow('C:\\maps\\legacy.zmind')).resolves.toBe(true)

    expect(docStore.sheets).toHaveLength(1)
    expect(docStore.workbook.title).toBe('Legacy map')
    expect(docStore.doc).toEqual(sheet)
  })

  it('saves every sheet in the workbook', async () => {
    const fileStore = useFileStore()
    const workbook = createWorkbookFromSheet(createBlankSheet('First'))
    workbook.sheets.push(createBlankSheet('Second'))

    fileStore.loadWorkbook(workbook, 'C:\\maps\\multi.zmind')

    await expect(fileStore.save()).resolves.toBe(true)

    const written = JSON.parse(mocked.writeDocumentFile.mock.calls[0][1])
    expect(written.schemaVersion).toBe(2)
    expect(written.sheets).toHaveLength(2)
    expect(written.sheets[1].title).toBe('Second')
  })

  it('does not mark the workbook dirty when only switching sheets', () => {
    const fileStore = useFileStore()
    const docStore = useDocumentStore()
    const workbook = createWorkbookFromSheet(createBlankSheet('First'))
    workbook.sheets.push(createBlankSheet('Second'))

    fileStore.loadWorkbook(workbook, 'C:\\maps\\multi.zmind')
    fileStore.startTracking()

    docStore.switchSheet(docStore.sheets[1].id)

    expect(fileStore.isDirty).toBe(false)
  })

  it('opens a legacy single-sheet file and migrates it', async () => {
    const fileStore = useFileStore()
    const docStore = useDocumentStore()
    const legacy = { schemaVersion: 1, ...createBlankSheet('Legacy map') }

    mocked.readDocumentFile.mockResolvedValueOnce(JSON.stringify(legacy))
    await expect(fileStore.openPathNow('C:\\maps\\legacy.zmind')).resolves.toBe(true)

    expect(docStore.workbook.schemaVersion).toBe(2)
    expect(docStore.sheets).toHaveLength(1)
    expect(docStore.doc.title).toBe('Legacy map')
  })

  it('saves every sheet and the active sheet id', async () => {
    const fileStore = useFileStore()
    const docStore = useDocumentStore()

    fileStore.loadWorkbook(
      createWorkbookFromSheet(createBlankSheet('Project')),
      'C:\\maps\\project.zmind',
    )
    const secondId = docStore.addSheet()
    docStore.renameSheet(secondId, 'Plan')
    mocked.writeDocumentFile.mockClear()

    await expect(fileStore.save()).resolves.toBe(true)

    const contents = JSON.parse(mocked.writeDocumentFile.mock.calls[0][1])
    expect(contents.schemaVersion).toBe(2)
    expect(contents.sheets).toHaveLength(2)
    expect(contents.sheets[1].title).toBe('Plan')
    expect(contents.activeSheetId).toBe(secondId)
  })

  it('does not mark the file dirty when switching sheets', () => {
    const fileStore = useFileStore()
    const docStore = useDocumentStore()

    fileStore.loadWorkbook(createWorkbookFromSheet(createBlankSheet('Project')), null)
    fileStore.startTracking()
    docStore.addSheet()
    expect(fileStore.isDirty).toBe(true)

    fileStore.markClean()
    expect(fileStore.isDirty).toBe(false)

    docStore.switchSheet(docStore.sheets[0].id)
    expect(fileStore.isDirty).toBe(false)
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
