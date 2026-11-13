import type { Marker, NodeStyle } from '@/domain/model/types'
import { MARKER_TEXT_GAP, layoutMarkerRow, type MarkerLayout } from '@/domain/markers/layout'

import { borderMetrics } from './border'
import { getEffectiveFont, type NodeVisualStyle } from './style'

let context: CanvasRenderingContext2D | null | undefined
const widthCache = new Map<string, number>()

function getMeasureContext(): CanvasRenderingContext2D | null {
  if (context !== undefined) return context

  if (typeof document === 'undefined') {
    context = null
    return context
  }

  try {
    const canvas = document.createElement('canvas')
    context = canvas.getContext('2d')
  } catch {
    context = null
  }

  return context
}

function measureTextWidth(text: string, font: string): number {
  const key = `${font}\u0000${text}`
  const cached = widthCache.get(key)
  if (cached !== undefined) return cached

  const ctx = getMeasureContext()
  let width: number

  if (ctx) {
    ctx.font = font
    width = ctx.measureText(text).width
  } else {
    const fontSize = Number(font.match(/(\d+(?:\.\d+)?)px/)?.[1] ?? 14)
    width = text.length * fontSize * 0.6
  }

  widthCache.set(key, width)
  return width
}

function wrapText(text: string, maxWidth: number, font: string): string[] {
  const lines: string[] = []

  for (const rawLine of text.split('\n')) {
    if (rawLine === '') {
      lines.push('')
      continue
    }

    let current = ''
    for (const char of Array.from(rawLine)) {
      const next = current + char
      if (current && measureTextWidth(next, font) > maxWidth) {
        lines.push(current)
        current = char
      } else {
        current = next
      }
    }

    if (current) lines.push(current)
  }

  return lines.length > 0 ? lines : ['']
}

export interface MeasuredNodeSize {
  width: number
  height: number
  lines: string[]
  visual: NodeVisualStyle
  markerLayout: MarkerLayout | null
}

export function measureNodeSize(
  title: string,
  depth: number,
  nodeStyle?: NodeStyle,
  markers?: Marker[],
): MeasuredNodeSize {
  const { fontSize, fontWeight, font, visual } = getEffectiveFont(depth, nodeStyle)
  const effectiveVisual: NodeVisualStyle = { ...visual, fontSize, fontWeight }
  const borders = borderMetrics(
    nodeStyle?.shape ?? 'rounded',
    nodeStyle?.borderWidth ?? (depth <= 1 ? 0 : 1.5),
  )
  const contentMaxWidth = visual.maxWidth - visual.paddingX * 2 - borders.horizontal
  const markerLayout = layoutMarkerRow(markers ?? [])
  const markerWidth = markerLayout ? markerLayout.width + MARKER_TEXT_GAP : 0
  const textMaxWidth = Math.max(40, contentMaxWidth - markerWidth)
  const lines = wrapText(title, textMaxWidth, font)
  const textWidth = lines.reduce((max, line) => Math.max(max, measureTextWidth(line, font)), 0)
  const contentWidth = markerWidth + textWidth
  const width = Math.min(
    visual.maxWidth,
    Math.max(visual.minWidth, contentWidth + visual.paddingX * 2 + borders.horizontal),
  )
  const lineHeight = Math.round(fontSize * 1.45)
  const contentHeight = Math.max(lines.length * lineHeight, markerLayout?.height ?? 0)
  const height = Math.max(
    contentHeight + visual.paddingY * 2 + borders.vertical,
    fontSize + visual.paddingY * 2 + borders.vertical,
  )

  return {
    width: Math.ceil(width),
    height: Math.ceil(height),
    lines,
    visual: effectiveVisual,
    markerLayout,
  }
}
