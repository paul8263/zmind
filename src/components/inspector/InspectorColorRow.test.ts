import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import InspectorColorRow from './InspectorColorRow.vue'

describe('InspectorColorRow', () => {
  let pinia: ReturnType<typeof createPinia>

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  function mountRow(value = '#ffffff') {
    return mount(InspectorColorRow, {
      attachTo: document.body,
      props: {
        label: 'Fill',
        value,
        isDefault: false,
        name: 'fill',
        palette: ['#ffffff', '#ef4444'],
      },
      global: { plugins: [pinia] },
    })
  }

  async function openCustom(wrapper: ReturnType<typeof mountRow>) {
    await wrapper.find('[data-color-trigger="fill"]').trigger('click')
    await flushPromises()
    document.querySelector<HTMLButtonElement>('[data-color-custom-toggle]')?.click()
    await flushPromises()
  }

  it('shows the palette and expands custom color inline', async () => {
    const wrapper = mountRow()

    expect(document.querySelectorAll('[data-color-swatch]')).toHaveLength(0)

    await wrapper.find('[data-color-trigger="fill"]').trigger('click')
    await flushPromises()

    expect(document.querySelectorAll('[data-color-swatch]')).toHaveLength(2)
    expect(document.querySelector('[data-color-custom-panel]')).toBeNull()

    document.querySelector<HTMLButtonElement>('[data-color-custom-toggle]')?.click()
    await flushPromises()

    expect(document.querySelector('[data-color-custom-panel]')).not.toBeNull()
    expect(document.querySelector('[data-color-hex]')).not.toBeNull()
    expect(document.querySelector('[data-color-channel="r"]')).not.toBeNull()

    wrapper.unmount()
  })

  it('emits the picked swatch color and closes the popover', async () => {
    const wrapper = mountRow()

    await wrapper.find('[data-color-trigger="fill"]').trigger('click')
    await flushPromises()
    document.querySelector<HTMLButtonElement>('[data-color-swatch="#ef4444"]')?.click()
    await flushPromises()

    expect(wrapper.emitted('change')?.[0]).toEqual(['#ef4444'])
    expect(document.querySelector('[data-color-popover="fill"]')).toBeNull()

    wrapper.unmount()
  })

  it('emits custom colors from the RGB sliders and hex field', async () => {
    const wrapper = mountRow()
    await openCustom(wrapper)

    const red = document.querySelector<HTMLInputElement>('[data-color-channel="r"]')!
    red.value = '0'
    red.dispatchEvent(new Event('input'))
    red.dispatchEvent(new Event('change'))
    await flushPromises()
    const sliderChanges = wrapper.emitted('change')!
    expect(sliderChanges[sliderChanges.length - 1]).toEqual(['#00ffff'])

    const hex = document.querySelector<HTMLInputElement>('[data-color-hex]')!
    hex.value = '#123456'
    hex.dispatchEvent(new Event('change'))
    await flushPromises()
    const hexChanges = wrapper.emitted('change')!
    expect(hexChanges[hexChanges.length - 1]).toEqual(['#123456'])

    wrapper.unmount()
  })

  it('marks the active swatch', async () => {
    const wrapper = mountRow('#ef4444')

    await wrapper.find('[data-color-trigger="fill"]').trigger('click')
    await flushPromises()

    expect(
      document.querySelector('[data-color-swatch="#ef4444"]')?.classList.contains('ring-2'),
    ).toBe(true)
    expect(
      document.querySelector('[data-color-swatch="#ffffff"]')?.classList.contains('ring-2'),
    ).toBe(false)

    wrapper.unmount()
  })
})
