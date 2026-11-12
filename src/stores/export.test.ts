// @vitest-environment node

import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createBlankSheet, createTopic, createWorkbookFromSheet } from '@/domain/model/document'
import * as bridge from '@/lib/fileBridge'

import { useDocumentStore } from './document'
import { useExportStore } from './export'
import { useFileStore } from './file'

vi.mock('@/lib/fileBridge', () => ({
  isDesktop: vi.fn(() => true),
  openFileDialog: vi.fn(),
  saveFileDialog: vi.fn(),
  readDocumentFile: vi.fn(),
  writeDocumentFile: vi.fn(),
  readImportFile: vi.fn(),
  writeExportFile: vi.fn(),
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
  readImportFile: vi.mocked(bridge.readImportFile),
  writeExportFile: vi.mocked(bridge.writeExportFile),
  readRecovery: vi.mocked(bridge.readRecovery),
  writeRecovery: vi.mocked(bridge.writeRecovery),
  clearRecovery: vi.mocked(bridge.clearRecovery),
  takePendingOpenFile: vi.mocked(bridge.takePendingOpenFile),
}

function makeDocument() {
  const doc = createBlankSheet('Export demo')
  doc.root.title = 'Root'
  doc.root.children.push(createTopic('Child'))
  return doc
}

function writtenText(): string {
  const bytes = mocked.writeExportFile.mock.calls[0][1]
  return new TextDecoder().decode(new Uint8Array(bytes))
}

describe('export store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mocked.isDesktop.mockReturnValue(true)
    mocked.openFileDialog.mockResolvedValue(null)
    mocked.saveFileDialog.mockResolvedValue(null)
    mocked.readDocumentFile.mockResolvedValue('')
    mocked.writeDocumentFile.mockResolvedValue(undefined)
    mocked.readImportFile.mockResolvedValue('')
    mocked.writeExportFile.mockResolvedValue(undefined)
    mocked.readRecovery.mockResolvedValue(null)
    mocked.writeRecovery.mockResolvedValue(undefined)
    mocked.clearRecovery.mockResolvedValue(undefined)
    mocked.takePendingOpenFile.mockResolvedValue(null)
  })

  afterEach(() => {
    useExportStore().clearNotice()
    useFileStore().stopTracking()
  })

  it('exports Markdown with a zmind extension appended when needed', async () => {
    const fileStore = useFileStore()
    const exportStore = useExportStore()
    fileStore.loadWorkbook(createWorkbookFromSheet(makeDocument()), 'C:/maps/demo.zmind')
    mocked.saveFileDialog.mockResolvedValue('C:/maps/export-demo')

    await exportStore.exportMarkdown()

    expect(mocked.writeExportFile).toHaveBeenCalledWith('C:/maps/export-demo.md', expect.any(Array))
    expect(writtenText()).toContain('# Root')
    expect(writtenText()).toContain('- Child')
    expect(exportStore.noticeKey).toBe('export.savedTo')
    expect(exportStore.exporting).toBe(false)
  })

  it('exports SVG content', async () => {
    const fileStore = useFileStore()
    const exportStore = useExportStore()
    fileStore.loadWorkbook(createWorkbookFromSheet(makeDocument()), 'C:/maps/demo.zmind')
    mocked.saveFileDialog.mockResolvedValue('C:/maps/export-demo.svg')

    await exportStore.exportSvg()

    expect(mocked.writeExportFile).toHaveBeenCalledWith(
      'C:/maps/export-demo.svg',
      expect.any(Array),
    )
    expect(writtenText()).toContain('<svg')
    expect(writtenText()).toContain('Root')
  })

  it('imports Markdown through the file store', async () => {
    const docStore = useDocumentStore()
    const exportStore = useExportStore()
    const fileStore = useFileStore()
    fileStore.startTracking()
    mocked.openFileDialog.mockResolvedValue('C:/maps/notes.md')
    mocked.readImportFile.mockResolvedValue('# Imported\n- Child')

    await exportStore.importDocument()

    expect(docStore.doc.title).toBe('Imported')
    expect(docStore.doc.root.children[0].title).toBe('Child')
    expect(docStore.sheets).toHaveLength(2)
    expect(docStore.activeSheetId).toBe(docStore.sheets[1].id)
    expect(fileStore.path).toBeNull()
    expect(fileStore.isDirty).toBe(true)
    expect(exportStore.noticeKey).toBe('import.success')
  })

  it('reports import parse errors', async () => {
    const exportStore = useExportStore()
    mocked.openFileDialog.mockResolvedValue('C:/maps/empty.md')
    mocked.readImportFile.mockResolvedValue('\n\n')

    await exportStore.importDocument()

    expect(exportStore.errorKey).toBe('import.errorParse')
    expect(exportStore.hasError).toBe(true)
  })

  it('reports desktop-only export errors outside Tauri', async () => {
    const exportStore = useExportStore()
    mocked.isDesktop.mockReturnValue(false)

    await exportStore.exportMarkdown()

    expect(exportStore.errorKey).toBe('export.errorDesktopOnly')
  })
})
