import type { Marker, MarkerColor, MarkerSymbol, MarkerType } from '@/domain/model/types'

export interface MarkerColorOption {
  value: MarkerColor
  labelKey: string
  hex: string
}

export const MARKER_COLORS: MarkerColorOption[] = [
  { value: 'red', labelKey: 'markers.color.red', hex: '#EF4444' },
  { value: 'orange', labelKey: 'markers.color.orange', hex: '#F97316' },
  { value: 'yellow', labelKey: 'markers.color.yellow', hex: '#EAB308' },
  { value: 'green', labelKey: 'markers.color.green', hex: '#22C55E' },
  { value: 'blue', labelKey: 'markers.color.blue', hex: '#3B82F6' },
  { value: 'purple', labelKey: 'markers.color.purple', hex: '#8B5CF6' },
  { value: 'gray', labelKey: 'markers.color.gray', hex: '#64748B' },
]

export const MARKER_COLOR_HEX: Record<MarkerColor, string> = {
  red: '#EF4444',
  orange: '#F97316',
  yellow: '#EAB308',
  green: '#22C55E',
  blue: '#3B82F6',
  purple: '#8B5CF6',
  gray: '#64748B',
}

export const MARKER_TYPES: MarkerType[] = [
  'solid',
  'priority',
  'progress',
  'flag',
  'star',
  'portrait',
  'symbol',
]

export const MARKER_TYPE_ORDER: Record<MarkerType, number> = {
  solid: 0,
  priority: 1,
  progress: 2,
  flag: 3,
  star: 4,
  portrait: 5,
  symbol: 6,
}

export const PRIORITY_VALUES = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const

export const PROGRESS_VALUES = ['0', '17', '33', '50', '67', '83', '100'] as const

export const PROGRESS_FRACTIONS: Record<string, number> = {
  '0': 0,
  '17': 1 / 6,
  '33': 2 / 6,
  '50': 3 / 6,
  '67': 4 / 6,
  '83': 5 / 6,
  '100': 1,
}

export const SYMBOL_VALUES: MarkerSymbol[] = [
  'heart',
  'thumb-up',
  'thumb-down',
  'bolt',
  'hourglass',
  'check',
  'cross',
  'question',
  'exclamation',
]

export const SYMBOL_LABEL_KEYS: Record<MarkerSymbol, string> = {
  heart: 'markers.symbol.heart',
  'thumb-up': 'markers.symbol.thumbUp',
  'thumb-down': 'markers.symbol.thumbDown',
  bolt: 'markers.symbol.bolt',
  hourglass: 'markers.symbol.hourglass',
  check: 'markers.symbol.check',
  cross: 'markers.symbol.cross',
  question: 'markers.symbol.question',
  exclamation: 'markers.symbol.exclamation',
}

export type GlyphPrimitive =
  | {
      kind: 'path'
      d: string
      fill?: string
      stroke?: string
      strokeWidth?: number
      transform?: string
    }
  | { kind: 'circle'; cx: number; cy: number; r: number; fill?: string }
  | { kind: 'text'; text: string; size: number }

export interface MarkerVisual {
  kind: 'solid' | 'progress' | 'glyph'
  background: string
  piePath?: string
  pieFull?: boolean
  glyphs: GlyphPrimitive[]
}

export function markerKey(marker: Marker): string {
  return `${marker.type}|${marker.color ?? ''}|${marker.value ?? ''}`
}

export function normalizeMarker(marker: Marker): Marker {
  if (marker.type === 'progress') return { type: marker.type, value: marker.value }
  if (marker.type === 'priority' || marker.type === 'symbol') {
    return { type: marker.type, color: marker.color, value: marker.value }
  }
  return { type: marker.type, color: marker.color }
}

function markerValueIndex(marker: Marker): number {
  if (marker.type === 'priority') {
    return PRIORITY_VALUES.findIndex((value) => value === marker.value)
  }
  if (marker.type === 'progress') {
    return PROGRESS_VALUES.findIndex((value) => value === marker.value)
  }
  if (marker.type === 'symbol') {
    return SYMBOL_VALUES.indexOf(marker.value as MarkerSymbol)
  }
  return 0
}

export function sortMarkers(markers: Marker[]): Marker[] {
  return [...markers].sort((left, right) => {
    const typeDiff = MARKER_TYPE_ORDER[left.type] - MARKER_TYPE_ORDER[right.type]
    if (typeDiff !== 0) return typeDiff

    const colorDiff =
      MARKER_COLORS.findIndex((color) => color.value === left.color) -
      MARKER_COLORS.findIndex((color) => color.value === right.color)
    if (colorDiff !== 0) return colorDiff

    return markerValueIndex(left) - markerValueIndex(right)
  })
}

export function toggleMarkerInList(markers: Marker[], marker: Marker): Marker[] {
  const normalized = normalizeMarker(marker)
  const existing = markers.find((item) => item.type === normalized.type)

  if (existing && markerKey(existing) === markerKey(normalized)) {
    return sortMarkers(markers.filter((item) => item !== existing))
  }

  const next = existing
    ? markers.map((item) => (item === existing ? normalized : item))
    : [...markers, normalized]

  return sortMarkers(next)
}

export function markersForType(type: MarkerType): Marker[] {
  if (type === 'progress') return PROGRESS_VALUES.map((value) => ({ type, value }))
  if (type === 'priority') {
    return PRIORITY_VALUES.flatMap((value) =>
      MARKER_COLORS.map((color) => ({ type, color: color.value, value })),
    )
  }
  if (type === 'symbol') {
    return SYMBOL_VALUES.flatMap((value) =>
      MARKER_COLORS.map((color) => ({ type, color: color.value, value })),
    )
  }
  return MARKER_COLORS.map((color) => ({ type, color: color.value }))
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}

function describePie(fraction: number): string {
  const cx = 8
  const cy = 8
  const radius = 6.2
  const angle = fraction * Math.PI * 2
  const endX = cx + radius * Math.sin(angle)
  const endY = cy - radius * Math.cos(angle)
  const largeArc = fraction > 0.5 ? 1 : 0

  return `M ${cx} ${cy} L ${cx} ${cy - radius} A ${radius} ${radius} 0 ${largeArc} 1 ${round(endX)} ${round(endY)} Z`
}

function glyphsFor(marker: Marker): GlyphPrimitive[] {
  if (marker.type === 'priority') {
    return [{ kind: 'text', text: marker.value ?? '1', size: 10 }]
  }

  if (marker.type === 'flag') {
    return [
      { kind: 'path', d: 'M4.6 13.2V2.8', stroke: '#ffffff', strokeWidth: 1.6 },
      { kind: 'path', d: 'M4.6 3.6h7.1l-2.1 3.1 2.1 3.1H4.6z', fill: '#ffffff' },
    ]
  }

  if (marker.type === 'star') {
    return [
      {
        kind: 'path',
        d: 'M8 2.1l1.6 3.4 3.7.5-2.7 2.6.7 3.7L8 10.5l-3.3 1.8.7-3.7-2.7-2.6 3.7-.5z',
        fill: '#ffffff',
      },
    ]
  }

  if (marker.type === 'portrait') {
    return [
      { kind: 'circle', cx: 8, cy: 5.8, r: 2.3, fill: '#ffffff' },
      {
        kind: 'path',
        d: 'M3.9 13.2c0-2.4 1.9-3.9 4.1-3.9s4.1 1.5 4.1 3.9z',
        fill: '#ffffff',
      },
    ]
  }

  const symbol = marker.value as MarkerSymbol

  if (symbol === 'heart') {
    return [
      {
        kind: 'path',
        d: 'M8 13.1S2.7 10 2.7 6.6a2.8 2.8 0 0 1 5.3-1.3 2.8 2.8 0 0 1 5.3 1.3c0 3.4-5.3 6.5-5.3 6.5z',
        fill: '#ffffff',
      },
    ]
  }

  if (symbol === 'thumb-up' || symbol === 'thumb-down') {
    const transform = symbol === 'thumb-down' ? 'rotate(180 8 8)' : undefined
    return [
      {
        kind: 'path',
        d: 'M3.1 7.4h2.1v5.9H3.1z',
        fill: '#ffffff',
        transform,
      },
      {
        kind: 'path',
        d: 'M6.1 13.3V7.1l2.5-4.2c.5-.9 1.8-.4 1.6.6l-.6 2.3h2.6c.9 0 1.5.8 1.3 1.6l-.9 4.3c-.2.9-1 1.6-1.9 1.6z',
        fill: '#ffffff',
        transform,
      },
    ]
  }

  if (symbol === 'bolt') {
    return [
      {
        kind: 'path',
        d: 'M9.6 1.8 3.7 9.1h3.7l-.9 5.1 5.9-7.5H8.7z',
        fill: '#ffffff',
      },
    ]
  }

  if (symbol === 'hourglass') {
    return [
      { kind: 'path', d: 'M4.4 2.7h7.2', stroke: '#ffffff', strokeWidth: 1.4 },
      { kind: 'path', d: 'M4.4 13.3h7.2', stroke: '#ffffff', strokeWidth: 1.4 },
      {
        kind: 'path',
        d: 'M5.2 2.7v1.7c0 .9.4 1.7 1.1 2.3L8 8.3l1.7-1.6c.7-.6 1.1-1.4 1.1-2.3V2.7',
        stroke: '#ffffff',
        strokeWidth: 1.4,
      },
      {
        kind: 'path',
        d: 'M5.2 13.3v-1.7c0-.9.4-1.7 1.1-2.3L8 7.7l1.7 1.6c.7.6 1.1 1.4 1.1 2.3v1.7',
        stroke: '#ffffff',
        strokeWidth: 1.4,
      },
    ]
  }

  if (symbol === 'check') {
    return [{ kind: 'path', d: 'M3.5 8.4l2.8 2.8 6-6.4', stroke: '#ffffff', strokeWidth: 1.8 }]
  }

  if (symbol === 'cross') {
    return [
      { kind: 'path', d: 'M4.5 4.5l7 7', stroke: '#ffffff', strokeWidth: 1.8 },
      { kind: 'path', d: 'M11.5 4.5l-7 7', stroke: '#ffffff', strokeWidth: 1.8 },
    ]
  }

  if (symbol === 'question') return [{ kind: 'text', text: '?', size: 10 }]
  return [{ kind: 'text', text: '!', size: 10 }]
}

export function markerVisual(marker: Marker): MarkerVisual {
  if (marker.type === 'solid') {
    return {
      kind: 'solid',
      background: MARKER_COLOR_HEX[marker.color ?? 'gray'],
      glyphs: [],
    }
  }

  if (marker.type === 'progress') {
    const fraction = PROGRESS_FRACTIONS[marker.value ?? '0'] ?? 0
    return {
      kind: 'progress',
      background: '#F0FDF4',
      pieFull: fraction >= 1,
      piePath: fraction > 0 && fraction < 1 ? describePie(fraction) : undefined,
      glyphs: [],
    }
  }

  return {
    kind: 'glyph',
    background: MARKER_COLOR_HEX[marker.color ?? 'gray'],
    glyphs: glyphsFor(marker),
  }
}
