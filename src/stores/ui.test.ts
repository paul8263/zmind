// @vitest-environment node

import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import { useUiStore } from './ui'

describe('ui store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('toggles dark mode and locale', () => {
    const store = useUiStore()

    store.toggleDark()
    expect(store.darkMode).toBe(true)
    store.toggleDark()
    expect(store.darkMode).toBe(false)

    expect(store.locale).toBe('zh')
    store.toggleLocale()
    expect(store.locale).toBe('en')
    store.setLocale('zh')
    expect(store.locale).toBe('zh')
  })

  it('toggles side panels and switches inspector tabs', () => {
    const store = useUiStore()
    const outline = store.outlineOpen
    const inspector = store.inspectorOpen

    store.toggleOutline()
    store.toggleInspector()
    expect(store.outlineOpen).toBe(!outline)
    expect(store.inspectorOpen).toBe(!inspector)

    store.setInspectorTab('theme')
    expect(store.inspectorTab).toBe('theme')
  })
})
