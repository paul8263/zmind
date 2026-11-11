import { invoke, isTauri } from '@tauri-apps/api/core'
import { open, save } from '@tauri-apps/plugin-dialog'

export interface FileDialogOptions {
  title: string
  filterName: string
  extensions?: string[]
}

export function isDesktop(): boolean {
  return isTauri()
}

export async function openFileDialog(options: FileDialogOptions): Promise<string | null> {
  const selected = await open({
    title: options.title,
    multiple: false,
    directory: false,
    filters: [{ name: options.filterName, extensions: options.extensions ?? ['zmind'] }],
  })

  return typeof selected === 'string' ? selected : null
}

export async function saveFileDialog(
  options: FileDialogOptions & { defaultPath: string },
): Promise<string | null> {
  const selected = await save({
    title: options.title,
    defaultPath: options.defaultPath,
    filters: [{ name: options.filterName, extensions: options.extensions ?? ['zmind'] }],
  })

  return selected ?? null
}

export function readDocumentFile(path: string): Promise<string> {
  return invoke<string>('read_document', { path })
}

export function writeDocumentFile(path: string, contents: string): Promise<void> {
  return invoke<void>('write_document', { path, contents })
}

export function readImportFile(path: string): Promise<string> {
  return invoke<string>('read_import_file', { path })
}

export function writeExportFile(path: string, contents: number[]): Promise<void> {
  return invoke<void>('write_export', { path, contents })
}

export function readRecovery(): Promise<string | null> {
  return invoke<string | null>('read_recovery')
}

export function writeRecovery(contents: string): Promise<void> {
  return invoke<void>('write_recovery', { contents })
}

export function clearRecovery(): Promise<void> {
  return invoke<void>('clear_recovery')
}

export function takePendingOpenFile(): Promise<string | null> {
  return invoke<string | null>('take_pending_open_file')
}

export function setMenuLocale(locale: 'zh' | 'en'): Promise<void> {
  return invoke<void>('set_menu_locale', { locale })
}
