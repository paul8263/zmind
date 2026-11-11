import { computed, toRaw } from 'vue'

import { layoutDocument, type LayoutResult } from '@/domain/layout/logical'
import type { MindMapDocument } from '@/domain/model/types'
import type { MindMapTheme } from '@/domain/theme'
import { useDocumentStore } from '@/stores/document'
import { useThemeStore } from '@/stores/theme'

let layoutCache = new WeakMap<object, WeakMap<object, LayoutResult>>()

function cachedLayout(doc: MindMapDocument, theme: MindMapTheme): LayoutResult {
  const docKey = toRaw(doc)
  let byTheme = layoutCache.get(docKey)
  if (!byTheme) {
    byTheme = new WeakMap()
    layoutCache.set(docKey, byTheme)
  }

  const themeKey = toRaw(theme)
  const cached = byTheme.get(themeKey)
  if (cached) return cached

  const result = layoutDocument(docKey, theme)
  byTheme.set(themeKey, result)
  return result
}

export function clearLayoutCache() {
  layoutCache = new WeakMap()
}

export function useLayout() {
  const docStore = useDocumentStore()
  const themeStore = useThemeStore()
  const theme = computed(() => themeStore.byId(docStore.doc.themeId))
  const layout = computed(() => cachedLayout(docStore.doc, theme.value))

  return { theme, layout }
}
