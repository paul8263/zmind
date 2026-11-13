import { describe, expect, it } from 'vitest'

import type { Marker } from '@/domain/model/types'

import { MARKER_GAP, MARKER_SIZE, layoutMarkerRow } from './layout'

const markers: Marker[] = [
  { type: 'solid', color: 'red' },
  { type: 'priority', color: 'orange', value: '1' },
  { type: 'progress', value: '50' },
  { type: 'flag', color: 'blue' },
]

describe('marker layout', () => {
  it('returns null for topics without markers', () => {
    expect(layoutMarkerRow([])).toBeNull()
  })

  it('lays out a single marker', () => {
    const layout = layoutMarkerRow([{ type: 'star', color: 'yellow' }])

    expect(layout).not.toBeNull()
    expect(layout?.width).toBe(MARKER_SIZE)
    expect(layout?.height).toBe(MARKER_SIZE)
    expect(layout?.rows[0][0]).toMatchObject({ x: 0, y: 0 })
  })

  it('keeps all markers in a single horizontal row', () => {
    const layout = layoutMarkerRow(markers)

    expect(layout?.rows).toHaveLength(1)
    expect(layout?.rows[0]).toHaveLength(markers.length)
    expect(layout?.height).toBe(MARKER_SIZE)
    expect(layout?.width).toBe(markers.length * MARKER_SIZE + (markers.length - 1) * MARKER_GAP)
    expect(layout?.rows[0].map((item) => item.x)).toEqual([0, 20, 40, 60])
  })

  it('sorts markers by category, color and value', () => {
    const layout = layoutMarkerRow([...markers].reverse())

    expect(layout?.rows[0].map((item) => item.marker)).toEqual([
      { type: 'solid', color: 'red' },
      { type: 'priority', color: 'orange', value: '1' },
      { type: 'progress', value: '50' },
      { type: 'flag', color: 'blue' },
    ])
  })
})
