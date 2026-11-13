import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import { useDocumentStore } from '@/stores/document'

import MarkerPanel from './MarkerPanel.vue'

describe('MarkerPanel', () => {
  let pinia: ReturnType<typeof createPinia>

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
  })

  function mountPanel() {
    const store = useDocumentStore()
    store.select(store.doc.root.id)
    const wrapper = mount(MarkerPanel, { global: { plugins: [pinia] } })
    return { store, wrapper }
  }

  it('shows every category as a vertical section without tabs', () => {
    const { wrapper } = mountPanel()

    expect(wrapper.findAll('[data-marker-section]')).toHaveLength(7)
    expect(wrapper.findAll('[role="tab"]')).toHaveLength(0)
  })

  it('lists color variants directly for the star category', () => {
    const { wrapper } = mountPanel()
    const options = wrapper.findAll('[data-marker-section="star"] [data-marker-option]')

    expect(options.map((option) => option.attributes('data-marker-option'))).toEqual([
      'star|red|',
      'star|orange|',
      'star|yellow|',
      'star|green|',
      'star|blue|',
      'star|purple|',
      'star|gray|',
    ])
  })

  it('toggles a marker variant on click', async () => {
    const { store, wrapper } = mountPanel()
    const redStar = wrapper.find('[data-marker-option="star|red|"]')

    await redStar.trigger('click')
    expect(store.selectedNode?.markers).toEqual([{ type: 'star', color: 'red' }])

    await redStar.trigger('click')
    expect(store.selectedNode?.markers).toBeUndefined()
  })
})
