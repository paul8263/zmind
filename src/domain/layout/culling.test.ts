// @vitest-environment node

import { describe, expect, it } from 'vitest'

import { createBlankDocument, createTopic } from '@/domain/model/document'

import { cullLayout, rectsIntersect } from './culling'
import { layoutDocument } from './logical'

function makeLayout() {
  const doc = createBlankDocument()
  const first = createTopic('first')
  const second = createTopic('second')
  first.children.push(createTopic('first child'))
  second.children.push(createTopic('second child'))
  doc.root.children.push(first, second)
  return layoutDocument(doc)
}

describe('layout culling', () => {
  it('detects intersecting rectangles', () => {
    expect(
      rectsIntersect({ x: 0, y: 0, width: 10, height: 10 }, { x: 5, y: 5, width: 10, height: 10 }),
    ).toBe(true)
    expect(
      rectsIntersect(
        { x: 0, y: 0, width: 10, height: 10 },
        { x: 20, y: 20, width: 10, height: 10 },
      ),
    ).toBe(false)
  })

  it('keeps the full layout when the viewport has no size', () => {
    const layout = makeLayout()
    const culled = cullLayout(layout, { x: 0, y: 0, width: 0, height: 0 })
    expect(culled).toBe(layout)
  })

  it('culls nodes and connections outside the viewport', () => {
    const layout = makeLayout()
    const root = layout.byId.get(layout.nodes[0].id)
    if (!root) throw new Error('missing root')

    const culled = cullLayout(
      layout,
      { x: root.x - 4, y: root.y - 4, width: root.width + 8, height: root.height + 8 },
      0,
    )

    expect(culled.nodes.map((node) => node.id)).toEqual([root.id])
    expect(culled.connections.length).toBeGreaterThan(0)
    expect(culled.byId).toBe(layout.byId)
  })

  it('drops every node and connection far from the viewport', () => {
    const layout = makeLayout()
    const culled = cullLayout(layout, { x: 100000, y: 100000, width: 100, height: 100 })
    expect(culled.nodes).toHaveLength(0)
    expect(culled.connections).toHaveLength(0)
  })

  it('expands the viewport by the culling margin', () => {
    const layout = makeLayout()
    const root = layout.byId.get(layout.nodes[0].id)
    if (!root) throw new Error('missing root')

    const tight = cullLayout(
      layout,
      { x: root.x + root.width + 1, y: root.y, width: 10, height: 10 },
      0,
    )
    const expanded = cullLayout(
      layout,
      { x: root.x + root.width + 1, y: root.y, width: 10, height: 10 },
      80,
    )

    expect(tight.nodes).toHaveLength(0)
    expect(expanded.nodes.length).toBeGreaterThan(0)
  })
})
