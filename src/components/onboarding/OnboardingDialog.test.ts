import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useFileStore } from '@/stores/file'
import { useUiStore } from '@/stores/ui'

import OnboardingDialog from './OnboardingDialog.vue'

describe('onboarding dialog', () => {
  let pinia: ReturnType<typeof createPinia>

  beforeEach(() => {
    localStorage.clear()
    pinia = createPinia()
    setActivePinia(pinia)
  })

  it('starts a blank document and remembers the guide was completed', async () => {
    const uiStore = useUiStore()
    const fileStore = useFileStore()
    const newNow = vi.spyOn(fileStore, 'newNow')
    uiStore.onboardingOpen = true

    const wrapper = mount(OnboardingDialog, {
      global: { plugins: [pinia] },
    })

    await wrapper.get('[data-onboarding-blank]').trigger('click')

    expect(newNow).toHaveBeenCalledOnce()
    expect(uiStore.onboardingOpen).toBe(false)
    expect(localStorage.getItem('zmind.ui.onboarded')).toBe('1')
  })

  it('can be dismissed without replacing the document', async () => {
    const uiStore = useUiStore()
    const fileStore = useFileStore()
    const newNow = vi.spyOn(fileStore, 'newNow')
    uiStore.onboardingOpen = true

    const wrapper = mount(OnboardingDialog, {
      global: { plugins: [pinia] },
    })

    await wrapper.get('[data-onboarding-start]').trigger('click')

    expect(newNow).not.toHaveBeenCalled()
    expect(uiStore.onboardingOpen).toBe(false)
  })
})
