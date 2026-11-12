import { defineStore } from 'pinia'

import type { Locale } from '@/i18n/messages'

export type InspectorTab = 'style' | 'theme'

const KEYS = {
  dark: 'zmind.ui.dark',
  locale: 'zmind.ui.locale',
  outline: 'zmind.ui.outline',
  inspector: 'zmind.ui.inspector',
  onboarded: 'zmind.ui.onboarded',
}

function read(key: string, fallback: string): string {
  if (typeof localStorage === 'undefined') return fallback

  try {
    return localStorage.getItem(key) ?? fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: string) {
  if (typeof localStorage === 'undefined') return

  try {
    localStorage.setItem(key, value)
  } catch {
    // Storage can be unavailable in restricted webviews; UI state still works in memory.
  }
}

export const useUiStore = defineStore('ui', {
  state: () => ({
    darkMode: read(KEYS.dark, '0') === '1',
    locale: (read(KEYS.locale, 'zh') === 'en' ? 'en' : 'zh') as Locale,
    outlineOpen: read(KEYS.outline, '0') === '1',
    inspectorOpen: read(KEYS.inspector, '1') !== '0',
    inspectorTab: 'style' as InspectorTab,
    onboardingOpen: read(KEYS.onboarded, '0') !== '1',
    aboutOpen: false,
  }),
  actions: {
    setDark(value: boolean) {
      this.darkMode = value
      write(KEYS.dark, value ? '1' : '0')
    },
    toggleDark() {
      this.setDark(!this.darkMode)
    },
    setLocale(locale: Locale) {
      this.locale = locale
      write(KEYS.locale, locale)
    },
    toggleLocale() {
      this.setLocale(this.locale === 'zh' ? 'en' : 'zh')
    },
    toggleOutline() {
      this.outlineOpen = !this.outlineOpen
      write(KEYS.outline, this.outlineOpen ? '1' : '0')
    },
    toggleInspector() {
      this.inspectorOpen = !this.inspectorOpen
      write(KEYS.inspector, this.inspectorOpen ? '1' : '0')
    },
    setInspectorTab(tab: InspectorTab) {
      this.inspectorTab = tab
    },
    openOnboarding() {
      this.onboardingOpen = true
    },
    completeOnboarding() {
      this.onboardingOpen = false
      write(KEYS.onboarded, '1')
    },
    openAbout() {
      this.aboutOpen = true
    },
    closeAbout() {
      this.aboutOpen = false
    },
  },
})
