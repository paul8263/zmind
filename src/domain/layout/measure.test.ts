// @vitest-environment node

import { describe, expect, it } from 'vitest'

import { MARKER_BLOCK_GAP, MARKER_SIZE } from '@/domain/markers/layout'
import type { Marker } from '@/domain/model/types'

import { measureNodeSize } from './measure'

describe('node measurement', () => {
  it('includes the third-level border in the box size', () => {
    const measured = measureNodeSize('Tab 创建子主题', 2)

    expect(measured.lines).toHaveLength(1)
    expect(measured.height).toBe(38)
  })

  it('does not add a border for borderless shapes', () => {
    const bordered = measureNodeSize('Tab 创建子主题', 2)
    const borderless = measureNodeSize('Tab 创建子主题', 2, { shape: 'none' })

    expect(bordered.height - borderless.height).toBe(3)
  })

  it('accounts for the underline border height', () => {
    const measured = measureNodeSize('Tab 创建子主题', 2, { shape: 'underline' })

    expect(measured.height).toBe(37)
  })

  it('adds space for a marker row', () => {
    const markers: Marker[] = [{ type: 'solid', color: 'red' }]
    const base = measureNodeSize('Tab 创建子主题', 2)
    const measured = measureNodeSize('Tab 创建子主题', 2, undefined, markers)

    expect(measured.height - base.height).toBe(MARKER_BLOCK_GAP + MARKER_SIZE)
    expect(measured.markerLayout?.rows).toHaveLength(1)
  })
})
