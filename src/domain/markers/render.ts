import { FONT_FAMILY } from '@/domain/layout/style'
import type { Marker } from '@/domain/model/types'

import { markerKey, markerVisual, type GlyphPrimitive } from './catalog'

function number(value: number): string {
  return String(Math.round(value * 100) / 100)
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function renderPrimitive(primitive: GlyphPrimitive): string {
  if (primitive.kind === 'path') {
    const fill = primitive.fill ? ` fill="${escapeXml(primitive.fill)}"` : ' fill="none"'
    const stroke = primitive.stroke ? ` stroke="${escapeXml(primitive.stroke)}"` : ''
    const strokeWidth = primitive.stroke
      ? ` stroke-width="${number(primitive.strokeWidth ?? 1.6)}"`
      : ''
    const transform = primitive.transform ? ` transform="${escapeXml(primitive.transform)}"` : ''
    return `<path d="${escapeXml(primitive.d)}"${fill}${stroke}${strokeWidth} stroke-linecap="round" stroke-linejoin="round"${transform}/>`
  }

  if (primitive.kind === 'circle') {
    return `<circle cx="${number(primitive.cx)}" cy="${number(primitive.cy)}" r="${number(primitive.r)}" fill="${escapeXml(primitive.fill ?? 'none')}"/>`
  }

  return `<text x="8" y="8.7" text-anchor="middle" dominant-baseline="middle" font-family="${escapeXml(FONT_FAMILY)}" font-size="${number(primitive.size)}" font-weight="700" fill="#ffffff">${escapeXml(primitive.text)}</text>`
}

export function renderMarkerSvg(marker: Marker, x: number, y: number, size = 16): string {
  const visual = markerVisual(marker)
  const scale = size / 16
  const parts: string[] = []

  if (visual.kind === 'solid') {
    parts.push(
      `<circle cx="8" cy="8" r="7.4" fill="${escapeXml(visual.background)}" stroke="#ffffff" stroke-opacity="0.35" stroke-width="1"/>`,
    )
  } else if (visual.kind === 'progress') {
    parts.push(
      `<circle cx="8" cy="8" r="7.2" fill="${escapeXml(visual.background)}" stroke="#86EFAC" stroke-width="1"/>`,
    )
    if (visual.pieFull) {
      parts.push('<circle cx="8" cy="8" r="6.2" fill="#22C55E"/>')
    } else if (visual.piePath) {
      parts.push(`<path d="${escapeXml(visual.piePath)}" fill="#22C55E"/>`)
    }
  } else {
    parts.push(`<circle cx="8" cy="8" r="7.4" fill="${escapeXml(visual.background)}"/>`)
    parts.push(...visual.glyphs.map(renderPrimitive))
  }

  return `<g data-marker="${escapeXml(markerKey(marker))}" transform="translate(${number(x)} ${number(y)}) scale(${number(scale)})">${parts.join('')}</g>`
}
