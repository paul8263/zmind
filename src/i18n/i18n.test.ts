// @vitest-environment node

import { describe, expect, it } from 'vitest'

import { translate } from './index'
import { messages } from './messages'

describe('i18n', () => {
  it('keeps Chinese and English message keys in sync', () => {
    expect(Object.keys(messages.en).sort()).toEqual(Object.keys(messages.zh).sort())
  })

  it('translates both locales', () => {
    expect(translate('zh', 'app.undo')).toBe('撤销')
    expect(translate('en', 'app.undo')).toBe('Undo')
  })

  it('interpolates parameters', () => {
    expect(
      translate('en', 'Hello {name}, you have {count} items', { name: 'Zmind', count: 3 }),
    ).toBe('Hello Zmind, you have 3 items')
  })

  it('returns the key when a message is missing', () => {
    expect(translate('en', 'missing.key')).toBe('missing.key')
  })
})
