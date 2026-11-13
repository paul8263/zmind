import { describe, expect, it } from 'vitest'

import { translate } from '@/i18n'

import { markerLabel } from './labels'

const zh = (key: string, params?: Record<string, string | number>) => translate('zh', key, params)

describe('marker labels', () => {
  it('formats priority, flags and symbols', () => {
    expect(markerLabel({ type: 'priority', color: 'red', value: '1' }, zh)).toBe('优先级 1')
    expect(markerLabel({ type: 'progress', value: '50' }, zh)).toBe('进度 50%')
    expect(markerLabel({ type: 'flag', color: 'red' }, zh)).toBe('红色旗')
    expect(markerLabel({ type: 'star', color: 'yellow' }, zh)).toBe('黄色星')
    expect(markerLabel({ type: 'portrait', color: 'blue' }, zh)).toBe('蓝色人像')
    expect(markerLabel({ type: 'symbol', color: 'green', value: 'heart' }, zh)).toBe('绿色爱心')
  })
})
