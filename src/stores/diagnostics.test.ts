// @vitest-environment node

import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useDiagnosticsStore } from './diagnostics'

describe('diagnostics store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  it('captures errors with source and stack', () => {
    const store = useDiagnosticsStore()
    store.capture('test', new Error('boom'), 'during render')

    expect(store.entries).toHaveLength(1)
    expect(store.lastError?.source).toBe('test')
    expect(store.lastError?.message).toBe('boom')
    expect(store.lastError?.info).toBe('during render')
    expect(store.logText).toContain('boom')
    expect(store.logText).toContain('during render')
  })

  it('keeps only the most recent fifty entries', () => {
    const store = useDiagnosticsStore()
    for (let index = 0; index < 55; index += 1) {
      store.capture('test', new Error(`error ${index}`))
    }

    expect(store.entries).toHaveLength(50)
    expect(store.entries[0].message).toBe('error 54')
  })

  it('dismisses the active error and clears the log', () => {
    const store = useDiagnosticsStore()
    store.capture('test', 'first')
    store.dismiss()
    expect(store.lastError).toBeNull()
    expect(store.entries).toHaveLength(1)

    store.clear()
    expect(store.entries).toHaveLength(0)
    expect(store.logText).toBe('')
  })
})
