import type { Marker } from '@/domain/model/types'

import { sortMarkers } from './catalog'

export const MARKER_SIZE = 16
export const MARKER_GAP = 4
export const MARKER_ROW_GAP = 4
export const MARKER_BLOCK_GAP = 6

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

export function layoutMarkers(markers: Marker[], maxWidth: number): MarkerLayout | null {
  if (markers.length === 0) return null

  const sorted = sortMarkers(markers)
  const rows: MarkerPlacement[][] = []
  const limit = Math.max(MARKER_SIZE, maxWidth)
  let row: MarkerPlacement[] = []
  let rowWidth = 0
  let y = 0

  for (const marker of sorted) {
    const needed = MARKER_SIZE + (row.length > 0 ? MARKER_GAP : 0)
    if (row.length > 0 && rowWidth + needed > limit) {
      rows.push(row)
      row = []
      rowWidth = 0
      y += MARKER_SIZE + MARKER_ROW_GAP
    }

    const x = rowWidth + (row.length > 0 ? MARKER_GAP : 0)
    row.push({ marker, x, y })
    rowWidth = x + MARKER_SIZE
  }

  if (row.length > 0) rows.push(row)

  const width = Math.max(...rows.map((item) => markerRowWidth(item)))
  const height = rows.length * MARKER_SIZE + Math.max(0, rows.length - 1) * MARKER_ROW_GAP

  return { rows, width, height }
}
