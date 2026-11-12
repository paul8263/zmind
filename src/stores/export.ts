import { defineStore } from 'pinia'

import { documentToMarkdown } from '@/domain/export/markdown'
import { ExportTooLargeError, svgToPngBlob } from '@/domain/export/raster'
import { renderDocumentSvg } from '@/domain/export/svg'
import { parseMarkdown } from '@/domain/import/markdown'
import { parseOpml } from '@/domain/import/opml'
import type { MindMapSheet } from '@/domain/model/types'
import { translate } from '@/i18n'
import type { MessageKey } from '@/i18n/messages'
import {
  isDesktop,
  openFileDialog,
  readImportFile,
  saveFileDialog,
  writeExportFile,
} from '@/lib/fileBridge'

import { useDocumentStore } from './document'
import { useFileStore } from './file'
import { useThemeStore } from './theme'
import { useUiStore } from './ui'

let noticeTimer: ReturnType<typeof setTimeout> | undefined

function clearNoticeTimer() {
  if (noticeTimer) {
    clearTimeout(noticeTimer)
    noticeTimer = undefined
  }
}

function yieldToUi(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 16))
}

function safeExportTitle(title: string): string {
  const cleaned = title.replace(/[\\/:*?"<>|]/g, '_').trim()
  return cleaned || 'Untitled'
}

function ensureExtension(path: string, extension: string): string {
  const suffix = `.${extension}`
  return path.toLowerCase().endsWith(suffix) ? path : `${path}${suffix}`
}

function fileExtension(path: string): string {
  return path.split('.').pop()?.toLowerCase() ?? ''
}

export const useExportStore = defineStore('export', {
  state: () => ({
    exporting: false,
    progress: 0,
    progressKey: 'export.generating' as MessageKey,
    errorKey: null as MessageKey | null,
    errorDetail: '',
    noticeKey: null as MessageKey | null,
    noticeDetail: '',
  }),
  getters: {
    hasError: (state) => Boolean(state.errorKey),
    hasNotice: (state) => Boolean(state.noticeKey),
  },
  actions: {
    renderCurrentSvg() {
      const docStore = useDocumentStore()
      const themeStore = useThemeStore()
      return renderDocumentSvg(docStore.doc, themeStore.byId(docStore.doc.themeId), {
        untitledTitle: translate(useUiStore().locale, 'topic.untitled'),
      })
    },
    async choosePath(
      formatKey: MessageKey,
      extension: string,
      filterKey: MessageKey,
    ): Promise<string | null> {
      const locale = useUiStore().locale
      const format = translate(locale, formatKey)
      return saveFileDialog({
        title: translate(locale, 'export.saveTitle', { format }),
        filterName: translate(locale, filterKey),
        extensions: [extension],
        defaultPath: `${safeExportTitle(useFileStore().displayName)}.${extension}`,
      })
    },
    async exportPng(scale: 1 | 2 | 3) {
      if (!isDesktop()) {
        this.setError('export.errorDesktopOnly')
        return
      }

      const path = await this.choosePath('export.png', 'png', 'export.filterPng')
      if (!path) return
      const finalPath = ensureExtension(path, 'png')

      this.exporting = true
      this.progress = 5
      this.progressKey = 'export.generating'
      await yieldToUi()

      try {
        const rendered = this.renderCurrentSvg()
        this.progress = 25
        await yieldToUi()

        const blob = await svgToPngBlob(rendered, scale)
        this.progress = 70
        this.progressKey = 'export.saving'
        await yieldToUi()

        const bytes = new Uint8Array(await blob.arrayBuffer())
        await writeExportFile(finalPath, Array.from(bytes))
        this.progress = 100
        this.setNotice('export.savedTo', finalPath)
      } catch (error) {
        if (error instanceof ExportTooLargeError) {
          this.setError('export.errorTooLarge')
        } else {
          this.setError('export.errorPng', error)
        }
      } finally {
        this.exporting = false
        this.progress = 0
      }
    },
    async exportSvg() {
      if (!isDesktop()) {
        this.setError('export.errorDesktopOnly')
        return
      }

      const path = await this.choosePath('export.svg', 'svg', 'export.filterSvg')
      if (!path) return
      const finalPath = ensureExtension(path, 'svg')

      this.exporting = true
      this.progress = 10
      this.progressKey = 'export.generating'
      await yieldToUi()

      try {
        const rendered = this.renderCurrentSvg()
        this.progress = 60
        this.progressKey = 'export.saving'
        await yieldToUi()

        const bytes = new TextEncoder().encode(rendered.svg)
        await writeExportFile(finalPath, Array.from(bytes))
        this.progress = 100
        this.setNotice('export.savedTo', finalPath)
      } catch (error) {
        this.setError('export.errorSvg', error)
      } finally {
        this.exporting = false
        this.progress = 0
      }
    },
    async exportMarkdown() {
      if (!isDesktop()) {
        this.setError('export.errorDesktopOnly')
        return
      }

      const path = await this.choosePath('export.markdown', 'md', 'export.filterMarkdown')
      if (!path) return
      const finalPath = ensureExtension(path, 'md')

      this.exporting = true
      this.progress = 10
      this.progressKey = 'export.saving'
      await yieldToUi()

      try {
        const markdown = documentToMarkdown(
          useDocumentStore().doc,
          translate(useUiStore().locale, 'topic.untitled'),
        )
        const bytes = new TextEncoder().encode(markdown)
        await writeExportFile(finalPath, Array.from(bytes))
        this.progress = 100
        this.setNotice('export.savedTo', finalPath)
      } catch (error) {
        this.setError('export.errorMarkdown', error)
      } finally {
        this.exporting = false
        this.progress = 0
      }
    },
    async exportPdf() {
      this.exporting = true
      this.progress = 10
      this.progressKey = 'export.generating'
      await yieldToUi()

      try {
        const rendered = this.renderCurrentSvg()
        this.progress = 50
        this.progressKey = 'export.printing'
        await yieldToUi()

        const root = document.createElement('div')
        root.className = 'export-print-root'
        root.innerHTML = rendered.svg
        document.body.appendChild(root)

        const cleanup = () => {
          root.remove()
          window.removeEventListener('afterprint', cleanup)
        }
        window.addEventListener('afterprint', cleanup, { once: true })
        await yieldToUi()
        window.print()
        this.progress = 100
        this.setNotice('export.pdfHint')
        setTimeout(cleanup, 60000)
      } catch (error) {
        this.setError('export.errorPdf', error)
      } finally {
        this.exporting = false
        this.progress = 0
      }
    },
    async importDocument() {
      if (!isDesktop()) {
        this.setError('import.errorDesktopOnly')
        return
      }

      const locale = useUiStore().locale
      let path: string | null
      try {
        path = await openFileDialog({
          title: translate(locale, 'import.openTitle'),
          filterName: translate(locale, 'import.filterName'),
          extensions: ['md', 'markdown', 'opml'],
        })
      } catch (error) {
        this.setError('import.errorRead', error)
        return
      }
      if (!path) return

      const extension = fileExtension(path)
      if (!['md', 'markdown', 'opml'].includes(extension)) {
        this.setError('import.errorUnsupported')
        return
      }

      let text: string
      try {
        text = await readImportFile(path)
      } catch (error) {
        this.setError('import.errorRead', error)
        return
      }

      let sheet: MindMapSheet
      try {
        const fallback = translate(locale, 'file.untitled')
        sheet = extension === 'opml' ? parseOpml(text, fallback) : parseMarkdown(text, fallback)
      } catch (error) {
        this.setError('import.errorParse', error)
        return
      }

      useDocumentStore().addSheetFrom(sheet)
      this.setNotice('import.success', sheet.title)
    },
    setNotice(key: MessageKey, detail = '') {
      clearNoticeTimer()
      this.noticeKey = key
      this.noticeDetail = detail
      noticeTimer = setTimeout(() => {
        this.noticeKey = null
        this.noticeDetail = ''
        noticeTimer = undefined
      }, 4000)
    },
    clearNotice() {
      clearNoticeTimer()
      this.noticeKey = null
      this.noticeDetail = ''
    },
    setError(key: MessageKey, error?: unknown) {
      this.errorKey = key
      this.errorDetail =
        error instanceof Error
          ? error.message
          : typeof error === 'string'
            ? error
            : error
              ? String(error)
              : ''
    },
    clearError() {
      this.errorKey = null
      this.errorDetail = ''
    },
  },
})
