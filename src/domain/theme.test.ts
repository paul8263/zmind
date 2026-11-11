// @vitest-environment node

import { describe, expect, it } from 'vitest'

import {
  BUILTIN_THEMES,
  CLASSIC_THEME,
  createCustomThemeId,
  DEFAULT_THEME_ID,
  resolveTheme,
  type MindMapTheme,
} from './theme'

function makeCustomTheme(id: string): MindMapTheme {
  return {
    id,
    name: { zh: '自定义', en: 'Custom' },
    mode: 'light',
    canvasBg: '#ffffff',
    rootFill: '#111111',
    rootText: '#ffffff',
    branchText: '#ffffff',
    nodeFill: '#eeeeee',
    nodeText: '#111111',
    branchPalette: ['#ff0000'],
    builtin: false,
  }
}

describe('themes', () => {
  it('ships six built-in themes with unique ids', () => {
    expect(BUILTIN_THEMES).toHaveLength(6)
    expect(new Set(BUILTIN_THEMES.map((theme) => theme.id)).size).toBe(6)
    expect(BUILTIN_THEMES.every((theme) => theme.builtin)).toBe(true)
    expect(BUILTIN_THEMES.every((theme) => theme.branchPalette.length > 0)).toBe(true)
  })

  it('falls back to the classic theme for unknown ids', () => {
    expect(resolveTheme('missing')).toBe(CLASSIC_THEME)
    expect(resolveTheme(undefined)).toBe(CLASSIC_THEME)
    expect(DEFAULT_THEME_ID).toBe(CLASSIC_THEME.id)
  })

  it('resolves a custom theme by id', () => {
    const custom = makeCustomTheme('custom-one')
    expect(resolveTheme('custom-one', [custom])).toBe(custom)
    expect(resolveTheme('custom-one')).toBe(CLASSIC_THEME)
  })

  it('creates unique custom theme ids', () => {
    const ids = new Set(Array.from({ length: 20 }, () => createCustomThemeId()))
    expect(ids.size).toBe(20)
    expect([...ids].every((id) => id.startsWith('custom-'))).toBe(true)
  })
})
