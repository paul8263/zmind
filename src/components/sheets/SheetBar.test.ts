import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import { useDocumentStore } from '@/stores/document'

import SheetBar from './SheetBar.vue'

describe('SheetBar', () => {
  let pinia: ReturnType<typeof createPinia>

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
  })

  function mountBar() {
    return mount(SheetBar, { global: { plugins: [pinia] } })
  }

  it('renders a tab per sheet and marks the active one', () => {
    const store = useDocumentStore()
    store.addSheet()
    const wrapper = mountBar()

    const tabs = wrapper.findAll('[data-sheet-tab]')
    expect(tabs).toHaveLength(2)
    expect(tabs[1].attributes('data-sheet-active')).toBe('true')

    wrapper.unmount()
  })

  it('switches sheets when a tab is clicked', async () => {
    const store = useDocumentStore()
    const firstId = store.activeSheetId
    store.addSheet()
    const wrapper = mountBar()

    await wrapper.findAll('[data-sheet-tab]')[0].trigger('click')

    expect(store.activeSheetId).toBe(firstId)
    wrapper.unmount()
  })

  it('adds a sheet from the add button', async () => {
    const store = useDocumentStore()
    const wrapper = mountBar()

    await wrapper.find('[data-sheet-add]').trigger('click')

    expect(store.sheets).toHaveLength(2)
    expect(store.activeSheetId).toBe(store.sheets[1].id)
    expect(wrapper.findAll('[data-sheet-tab]')).toHaveLength(2)
    wrapper.unmount()
  })

  it('renames a sheet inline with Enter', async () => {
    const store = useDocumentStore()
    const wrapper = mountBar()

    await wrapper.find('[data-sheet-tab]').trigger('dblclick')
    const input = wrapper.find('[data-sheet-rename]')
    expect(input.exists()).toBe(true)

    await input.setValue('计划')
    await input.trigger('keydown', { key: 'Enter' })

    expect(store.doc.title).toBe('计划')
    expect(wrapper.find('[data-sheet-rename]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('cancels a rename with Escape', async () => {
    const store = useDocumentStore()
    const original = store.doc.title
    const wrapper = mountBar()

    await wrapper.find('[data-sheet-tab]').trigger('dblclick')
    const input = wrapper.find('[data-sheet-rename]')
    await input.setValue('不会保存')
    await input.trigger('keydown', { key: 'Escape' })

    expect(store.doc.title).toBe(original)
    wrapper.unmount()
  })

  it('duplicates a sheet from the context menu', async () => {
    const store = useDocumentStore()
    const wrapper = mountBar()

    await wrapper.find('[data-sheet-tab]').trigger('contextmenu')
    await wrapper.find('[data-sheet-context-item="duplicate"]').trigger('click')

    expect(store.sheets).toHaveLength(2)
    expect(store.sheets[1].title).toContain('副本')
    expect(store.activeSheetId).toBe(store.sheets[1].id)
    wrapper.unmount()
  })

  it('deletes a sheet after confirmation', async () => {
    const store = useDocumentStore()
    store.addSheet()
    const wrapper = mountBar()

    await wrapper.findAll('[data-sheet-tab]')[0].trigger('contextmenu')
    await wrapper.find('[data-sheet-context-item="delete"]').trigger('click')
    expect(wrapper.find('[data-sheet-delete-dialog]').exists()).toBe(true)

    await wrapper.find('[data-sheet-delete-confirm]').trigger('click')

    expect(store.sheets).toHaveLength(1)
    expect(wrapper.find('[data-sheet-delete-dialog]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('disables deleting the last remaining sheet', async () => {
    const wrapper = mountBar()

    await wrapper.find('[data-sheet-tab]').trigger('contextmenu')
    const item = wrapper.find('[data-sheet-context-item="delete"]')

    expect(item.attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })

  it('moves a sheet with the context menu', async () => {
    const store = useDocumentStore()
    const firstId = store.activeSheetId
    store.addSheet()
    const secondId = store.activeSheetId
    const wrapper = mountBar()

    await wrapper.findAll('[data-sheet-tab]')[1].trigger('contextmenu')
    await wrapper.find('[data-sheet-context-item="move-left"]').trigger('click')

    expect(store.sheets.map((sheet) => sheet.id)).toEqual([secondId, firstId])
    wrapper.unmount()
  })
})
