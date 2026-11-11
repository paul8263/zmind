// @vitest-environment node

import { describe, expect, it } from 'vitest'

import { borderMetrics } from './border'

describe('border metrics', () => {
  it('counts full borders on all sides', () => {
    expect(borderMetrics('rounded', 1.5)).toEqual({
      full: 1.5,
      bottom: 0,
      horizontal: 3,
      vertical: 3,
    })
  })

  it('counts only the underline border', () => {
    expect(borderMetrics('underline', 1.5)).toEqual({
      full: 0,
      bottom: 2,
      horizontal: 0,
      vertical: 2,
    })
  })

  it('has no border for the none shape', () => {
    expect(borderMetrics('none', 4)).toEqual({
      full: 0,
      bottom: 0,
      horizontal: 0,
      vertical: 0,
    })
  })
})
