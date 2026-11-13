import type { Marker, MarkerSymbol } from '@/domain/model/types'

import { SYMBOL_LABEL_KEYS } from './catalog'

type Translate = (key: string, params?: Record<string, string | number>) => string

export function markerLabel(marker: Marker, t: Translate): string {
  const color = marker.color ? t(`markers.color.${marker.color}`) : ''

  switch (marker.type) {
    case 'solid':
      return color
    case 'priority':
      return t('markers.priorityLabel', { value: marker.value ?? '' })
    case 'progress':
      return t('markers.progressLabel', { value: marker.value ?? '' })
    case 'flag':
      return t('markers.flagWithColor', { color })
    case 'star':
      return t('markers.starWithColor', { color })
    case 'portrait':
      return t('markers.portraitWithColor', { color })
    case 'symbol': {
      const symbolKey = SYMBOL_LABEL_KEYS[marker.value as MarkerSymbol] ?? 'markers.symbol.heart'
      return t('markers.symbolWithColor', { color, symbol: t(symbolKey) })
    }
  }
}
