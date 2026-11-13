import { describe, expect, it } from 'vitest'

import type { Marker } from '@/domain/model/types'

import {
  MARKER_COLORS,
  MARKER_TYPES,
  PROGRESS_VALUES,
  markerKey,
  markerVisual,
  markersForCategory,
  sortMarkers,
  toggleMarkerInList,
} from './catalog'

describe('marker catalog', () => {
  it('exposes seven categories and seven colors', () => {
    expect(MARKER_TYPES).toHaveLength(7)
    expect(MARKER_COLORS).toHaveLength(7)
  })

  it('builds options for each category', () => {
    expect(markersForCategory('solid', 'red')).toHaveLength(1)
    expect(markersForCategory('priority', 'red')).toHaveLength(9)
    expect(markersForCategory('progress', 'red')).toHaveLength(7)
    expect(markersForCategory('flag', 'red')).toHaveLength(1)
    expect(markersForCategory('star', 'red')).toHaveLength(1)
    expect(markersForCategory('portrait', 'red')).toHaveLength(1)
    expect(markersForCategory('symbol', 'red')).toHaveLength(9)
  })

  it('toggles, replaces and removes markers within a category', () => {
    const first: Marker = { type: 'priority', color: 'red', value: '1' }
    const second: Marker = { type: 'priority', color: 'red', value: '2' }

    let markers = toggleMarkerInList([], first)
    expect(markers).toEqual([first])

    markers = toggleMarkerInList(markers, second)
    expect(markers).toEqual([second])

    markers = toggleMarkerInList(markers, second)
    expect(markers).toEqual([])
  })

  it('keeps markers from different categories', () => {
    const priority: Marker = { type: 'priority', color: 'red', value: '1' }
    const progress: Marker = { type: 'progress', value: '50' }
    const flag: Marker = { type: 'flag', color: 'blue' }

    const markers = [priority, progress, flag].reduce(toggleMarkerInList, [] as Marker[])

    expect(markers).toHaveLength(3)
  })

  it('sorts by category, color and value', () => {
    const markers: Marker[] = [
      { type: 'symbol', color: 'red', value: 'heart' },
      { type: 'priority', color: 'blue', value: '2' },
      { type: 'solid', color: 'green' },
      { type: 'priority', color: 'red', value: '1' },
      { type: 'progress', value: '50' },
    ]

    expect(sortMarkers(markers).map(markerKey)).toEqual([
      'solid|green|',
      'priority|red|1',
      'priority|blue|2',
      'progress||50',
      'symbol|red|heart',
    ])
  })

  it('creates solid, progress and glyph visuals', () => {
    expect(markerVisual({ type: 'solid', color: 'red' }).kind).toBe('solid')
    expect(markerVisual({ type: 'progress', value: '50' }).piePath).toBeTruthy()
    expect(markerVisual({ type: 'progress', value: '100' }).pieFull).toBe(true)
    expect(markerVisual({ type: 'priority', color: 'red', value: '1' }).glyphs[0]).toMatchObject({
      kind: 'text',
      text: '1',
    })
    expect(markerVisual({ type: 'symbol', color: 'red', value: 'heart' }).glyphs).toHaveLength(1)
  })

  it('exposes seven progress levels', () => {
    expect(PROGRESS_VALUES).toEqual(['0', '17', '33', '50', '67', '83', '100'])
  })
})
