// @vitest-environment node

import { describe, expect, it } from 'vitest'

import { createBlankDocument, createTopic } from '@/domain/model/document'

import { resolveDropTarget } from './drop'
import { layoutDocument, type LayoutNode } from './logical'

function makeLayout(structure: 'logic-right' | 'org-down' = 'logic-right') {
  const doc = createBlankDocument()
  doc.structure = structure

  const a = createTopic('a')
  const b = createTopic('b')
  const a1 = createTopic('a1')
  a.children.push(a1)
  doc.root.children.push(a, b)

  const layout = layoutDocument(doc)
  const root = layout.byId.get(doc.root.id) as LayoutNode
  const nodeA = layout.byId.get(a.id) as LayoutNode
  const nodeB = layout.byId.get(b.id) as LayoutNode
  const nodeA1 = layout.byId.get(a1.id) as LayoutNode

  return { doc, layout, root, a: nodeA, b: nodeB, a1: nodeA1 }
}

function center(node: LayoutNode) {
  return {
    x: node.x + node.width / 2,
    y: node.y + node.height / 2,
  }
}

describe('drag drop resolution', () => {
  it('drops onto the middle of a node as a child', () => {
    const { layout, a1, b } = makeLayout()
    const point = center(b)

    const target = resolveDropTarget(layout, a1.id, point.x, point.y, 'logic-right')

    expect(target).toEqual({
      nodeId: b.id,
      mode: 'child',
      newParentId: b.id,
      index: 0,
    })
  })

  it('drops near the top or bottom edge as a sibling before or after', () => {
    const { layout, root, a1, b } = makeLayout()
    const x = b.x + b.width / 2

    expect(resolveDropTarget(layout, a1.id, x, b.y + 1, 'logic-right')).toEqual({
      nodeId: b.id,
      mode: 'before',
      newParentId: root.id,
      index: 1,
    })

    expect(resolveDropTarget(layout, a1.id, x, b.y + b.height - 1, 'logic-right')).toEqual({
      nodeId: b.id,
      mode: 'after',
      newParentId: root.id,
      index: 2,
    })
  })

  it('drops onto the root as a child', () => {
    const { layout, root, a1 } = makeLayout()
    const point = center(root)

    const target = resolveDropTarget(layout, a1.id, point.x, point.y, 'logic-right')

    expect(target).toEqual({
      nodeId: root.id,
      mode: 'child',
      newParentId: root.id,
      index: 2,
    })
  })

  it('rejects dropping onto itself or a descendant', () => {
    const { layout, a, a1 } = makeLayout()

    expect(resolveDropTarget(layout, a.id, center(a).x, center(a).y, 'logic-right')).toBeNull()

    expect(resolveDropTarget(layout, a.id, center(a1).x, center(a1).y, 'logic-right')).toBeNull()
  })

  it('rejects a drop that would not change position', () => {
    const { layout, a, b } = makeLayout()

    expect(
      resolveDropTarget(layout, b.id, a.x + a.width / 2, a.y + a.height - 1, 'logic-right'),
    ).toBeNull()
  })

  it('uses horizontal edges for the vertical org chart layout', () => {
    const { layout, root, b, a1 } = makeLayout('org-down')

    expect(resolveDropTarget(layout, a1.id, b.x + 1, b.y + b.height / 2, 'org-down')).toEqual({
      nodeId: b.id,
      mode: 'before',
      newParentId: root.id,
      index: 1,
    })
  })
})
