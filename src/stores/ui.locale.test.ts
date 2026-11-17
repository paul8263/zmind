import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { detectLocale, useUiStore } from './ui'

function stubLanguages(languages: string[]) {
  vi.stubGlobal('navigator', { language: languages[0], languages })
}

describe('ui locale detection', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('detects simplified and traditional Chinese systems', () => {
    expect(detectLocale(['zh-CN'])).toBe('zh')
    expect(detectLocale(['zh-TW'])).toBe('zh')
    expect(detectLocale(['zh-Hant-HK'])).toBe('zh')
    expect(detectLocale(['zh'])).toBe('zh')
  })

  it('detects non-Chinese systems', () => {
    expect(detectLocale(['en-US'])).toBe('en')
    expect(detectLocale(['ja-JP'])).toBe('en')
  })

  it('picks the Chinese locale on first launch for Chinese systems', () => {
    stubLanguages(['zh-TW', 'en-US'])

    const store = useUiStore()

    expect(store.locale).toBe('zh')
    expect(localStorage.getItem('zmind.ui.locale')).toBe('zh')
  })

  it('picks English on first launch for other systems', () => {
    stubLanguages(['de-DE'])

    const store = useUiStore()

    expect(store.locale).toBe('en')
    expect(localStorage.getItem('zmind.ui.locale')).toBe('en')
  })

  it('keeps the saved locale on later launches', () => {
    localStorage.setItem('zmind.ui.locale', 'zh')
    stubLanguages(['en-US'])

    expect(useUiStore().locale).toBe('zh')
  })
})
