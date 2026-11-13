import type { Marker } from '@/domain/model/types'

import { sortMarkers } from './catalog'

export const MARKER_SIZE = 16
export const MARKER_GAP = 4
export const MARKER_TEXT_GAP = 6

export interface MarkerPlacement {
  marker: Marker
  x: number
  y: number
}

export interface MarkerLayout {
  rows: MarkerPlacement[][]
  width: number
  height: number
}

export function markerRowWidth(row: MarkerPlacement[]): number {
  if (row.length === 0) return 0
  const last = row[row.length - 1]
  return last.x + MARKER_SIZE
}

export function layoutMarkerRow(markers: Marker[]): MarkerLayout | null {
  if (markers.length === 0) return null

  const sorted = sortMarkers(markers)
  const row = sorted.map((marker, index) => ({
    marker,
    x: index * (MARKER_SIZE + MARKER_GAP),
    y: 0,
  }))

  return {
    rows: [row],
    width: markerRowWidth(row),
    height: MARKER_SIZE,
  }
}
