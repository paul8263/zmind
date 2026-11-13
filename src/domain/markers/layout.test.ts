import { describe, expect, it } from 'vitest'

import type { Marker } from '@/domain/model/types'

import { MARKER_GAP, MARKER_ROW_GAP, MARKER_SIZE, layoutMarkers } from './layout'

const markers: Marker[] = [
  { type: 'solid', color: 'red' },
  { type: 'priority', color: 'orange', value: '1' },
  { type: 'progress', value: '50' },
  { type: 'flag', color: 'blue' },
]

describe('marker layout', () => {
  it('returns null for topics without markers', () => {
    expect(layoutMarkers([], 200)).toBeNull()
  })

  it('lays out a single marker', () => {
    const layout = layoutMarkers([{ type: 'star', color: 'yellow' }], 200)

    expect(layout).not.toBeNull()
    expect(layout?.width).toBe(MARKER_SIZE)
    expect(layout?.height).toBe(MARKER_SIZE)
    expect(layout?.rows[0][0]).toMatchObject({ x: 0, y: 0 })
  })

  it('wraps markers into rows when the available width is small', () => {
    const layout = layoutMarkers(markers, MARKER_SIZE * 2 + MARKER_GAP)

    expect(layout?.rows).toHaveLength(2)
    expect(layout?.height).toBe(MARKER_SIZE * 2 + MARKER_ROW_GAP)
    expect(layout?.rows[0]).toHaveLength(2)
    expect(layout?.rows[1]).toHaveLength(2)
    expect(layout?.rows[1][0].y).toBe(MARKER_SIZE + MARKER_ROW_GAP)
  })
})
