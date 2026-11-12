import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createBlankSheet, createWorkbookFromSheet } from '@/domain/model/document'
import { useDocumentStore } from '@/stores/document'
import { useFileStore } from '@/stores/file'

import EmptyCanvasState from './EmptyCanvasState.vue'

describe('empty canvas state', () => {
  let pinia: ReturnType<typeof createPinia>

  beforeEach(() => {
    localStorage.clear()
    pinia = createPinia()
    setActivePinia(pinia)
  })

  it('adds the first topic to an empty document', async () => {
    const docStore = useDocumentStore()
    docStore.loadWorkbook(createWorkbookFromSheet(createBlankSheet()))

    const wrapper = mount(EmptyCanvasState, {
      global: { plugins: [pinia] },
    })

    await wrapper.get('[data-empty-add]').trigger('click')

    expect(docStore.doc.root.children).toHaveLength(1)
    expect(docStore.editingNodeId).toBe(docStore.doc.root.children[0].id)
  })

  it('loads the example document from the empty state', async () => {
    const docStore = useDocumentStore()
    docStore.loadWorkbook(createWorkbookFromSheet(createBlankSheet()))
    const fileStore = useFileStore()
    const loadExample = vi.spyOn(fileStore, 'loadExample')

    const wrapper = mount(EmptyCanvasState, {
      global: { plugins: [pinia] },
    })

    await wrapper.get('[data-empty-example]').trigger('click')

    expect(loadExample).toHaveBeenCalledOnce()
  })
})
