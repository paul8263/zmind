import { describe, expect, it } from 'vitest'

import {
  closeTransientOverlay,
  hasOpenTransientOverlay,
  openTransientOverlay,
} from './transientOverlay'

describe('transient overlay registry', () => {
  it('tracks open and closed overlays', () => {
    expect(hasOpenTransientOverlay()).toBe(false)

    const token = openTransientOverlay()
    expect(hasOpenTransientOverlay()).toBe(true)

    closeTransientOverlay(token)
    expect(hasOpenTransientOverlay()).toBe(false)
  })

  it('stays open until every overlay closes', () => {
    const first = openTransientOverlay()
    const second = openTransientOverlay()

    closeTransientOverlay(first)
    expect(hasOpenTransientOverlay()).toBe(true)

    closeTransientOverlay(second)
    expect(hasOpenTransientOverlay()).toBe(false)
  })
})
