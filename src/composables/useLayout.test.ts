import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import { BUILTIN_THEMES } from '@/domain/theme'
import { useDocumentStore } from '@/stores/document'
import { useThemeStore } from '@/stores/theme'

import { clearLayoutCache, useLayout } from './useLayout'

describe('useLayout', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    clearLayoutCache()
  })

  it('reuses the cached layout until the document changes', () => {
    const docStore = useDocumentStore()
    const { layout } = useLayout()

    const first = layout.value
    expect(layout.value).toBe(first)

    docStore.select(docStore.doc.root.children[0].id)
    expect(layout.value).toBe(first)

    docStore.rename(docStore.doc.root.id, 'Renamed root')
    const second = layout.value
    expect(second).not.toBe(first)
    expect(second.byId.get(docStore.doc.root.id)?.node.title).toBe('Renamed root')
  })

  it('invalidates the cache when a custom theme is replaced', () => {
    const docStore = useDocumentStore()
    const themeStore = useThemeStore()
    const custom = {
      ...BUILTIN_THEMES[0],
      id: 'custom-layout-test',
      name: { zh: '自定义布局测试', en: 'Custom layout test' },
      branchPalette: ['#111111'],
    }

    themeStore.addCustom(custom)
    docStore.setTheme(custom.id)
    const { layout } = useLayout()
    const first = layout.value
    expect(first.nodes[1].branchColor).toBe('#111111')

    themeStore.addCustom({ ...custom, branchPalette: ['#222222'] })
    const second = layout.value
    expect(second).not.toBe(first)
    expect(second.nodes[1].branchColor).toBe('#222222')
  })
})
