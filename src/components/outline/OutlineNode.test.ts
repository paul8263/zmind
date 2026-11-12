import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import { createBlankDocument, createTopic } from '@/domain/model/document'
import type { TopicNode } from '@/domain/model/types'
import { useDocumentStore } from '@/stores/document'

import OutlineNode from './OutlineNode.vue'

describe('OutlineNode', () => {
  let pinia: ReturnType<typeof createPinia>
  let store: ReturnType<typeof useDocumentStore>
  let child: TopicNode

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)

    store = useDocumentStore()
    const doc = createBlankDocument()
    child = createTopic('原始标题')
    doc.root.children.push(child)
    store.loadDocument(doc)
  })

  function mountOutline() {
    return mount(OutlineNode, {
      props: { node: store.doc.root, depth: 0 },
      global: { plugins: [pinia] },
    })
  }

  async function startEditing() {
    const wrapper = mountOutline()
    await wrapper.find(`[data-outline-node="${child.id}"]`).trigger('dblclick')
    const editor = wrapper.find<HTMLTextAreaElement>('[data-outline-editor]')
    expect(editor.exists()).toBe(true)
    return { wrapper, editor }
  }

  it('starts outline editing on double click', async () => {
    await startEditing()

    expect(store.editingNodeId).toBe(child.id)
    expect(store.editingSource).toBe('outline')
  })

  it('commits the new title with Enter', async () => {
    const { editor } = await startEditing()

    await editor.setValue('新的标题')
    await editor.trigger('keydown', { key: 'Enter' })

    expect(store.doc.root.children[0].title).toBe('新的标题')
    expect(store.editingNodeId).toBeNull()
  })

  it('keeps a newline for Shift+Enter', async () => {
    const { editor } = await startEditing()

    await editor.setValue('第一行')
    await editor.trigger('keydown', { key: 'Enter', shiftKey: true })

    expect(store.editingNodeId).toBe(child.id)
    expect(store.doc.root.children[0].title).toBe('原始标题')
  })

  it('discards the edit with Escape', async () => {
    const { editor } = await startEditing()

    await editor.setValue('不会保存')
    await editor.trigger('keydown', { key: 'Escape' })

    expect(store.doc.root.children[0].title).toBe('原始标题')
    expect(store.editingNodeId).toBeNull()
  })

  it('commits when the editor loses focus', async () => {
    const { editor } = await startEditing()

    await editor.setValue('失焦保存')
    await editor.trigger('blur')

    expect(store.doc.root.children[0].title).toBe('失焦保存')
  })
})
