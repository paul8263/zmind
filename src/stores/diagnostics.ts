import { defineStore } from 'pinia'

export interface DiagnosticEntry {
  id: number
  level: 'error' | 'warning'
  source: string
  message: string
  stack: string
  info: string
  time: string
}

const MAX_ENTRIES = 50

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message || error.name
  if (typeof error === 'string') return error
  if (error === null || error === undefined) return 'Unknown error'
  try {
    return JSON.stringify(error)
  } catch {
    return String(error)
  }
}

function errorStack(error: unknown): string {
  return error instanceof Error ? (error.stack ?? '') : ''
}

export const useDiagnosticsStore = defineStore('diagnostics', {
  state: () => ({
    entries: [] as DiagnosticEntry[],
    lastError: null as DiagnosticEntry | null,
    nextId: 1,
  }),
  getters: {
    logText(state): string {
      return state.entries
        .map((entry) => {
          const header = `[${entry.time}] ${entry.level.toUpperCase()} ${entry.source}: ${entry.message}`
          const info = entry.info ? `\ninfo: ${entry.info}` : ''
          const stack = entry.stack ? `\n${entry.stack}` : ''
          return `${header}${info}${stack}`
        })
        .join('\n\n')
    },
  },
  actions: {
    capture(source: string, error: unknown, info = '') {
      const entry: DiagnosticEntry = {
        id: this.nextId++,
        level: 'error',
        source,
        message: errorMessage(error),
        stack: errorStack(error),
        info,
        time: new Date().toISOString(),
      }

      this.entries.unshift(entry)
      if (this.entries.length > MAX_ENTRIES) this.entries.length = MAX_ENTRIES
      this.lastError = entry
      console.error(`[zmind:${source}]`, error, info)
    },
    dismiss() {
      this.lastError = null
    },
    clear() {
      this.entries = []
      this.lastError = null
    },
  },
})
