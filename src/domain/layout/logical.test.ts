// @vitest-environment node

import { describe, expect, it } from 'vitest'

import { createBlankSheet, createTopic } from '@/domain/model/document'
import { resolveTheme } from '@/domain/theme'

import { H_GAP, ORG_V_GAP, layoutDocument } from './logical'

function makeDocument() {
  const doc = createBlankSheet()
  const a = createTopic('a')
  const b = createTopic('b')
  const a1 = createTopic('a1')

  a.children.push(a1)
  doc.root.children.push(a, b)

  return doc
}

describe('logical layout', () => {
  it('lays out all visible nodes and connections', () => {
    const layout = layoutDocument(makeDocument())

    expect(layout.nodes).toHaveLength(4)
    expect(layout.connections).toHaveLength(3)
    expect(layout.bounds.width).toBeGreaterThan(0)
    expect(layout.bounds.height).toBeGreaterThan(0)
  })

  it('places children to the right of their parent', () => {
    const layout = layoutDocument(makeDocument())
    const root = layout.byId.get(layout.nodes[0].id)

    expect(root).toBeDefined()
    expect(root?.children).toHaveLength(2)

    for (const child of root?.children ?? []) {
      expect(child.x).toBe((root?.x ?? 0) + (root?.width ?? 0) + H_GAP)
      expect(child.y).toBeGreaterThanOrEqual(0)
    }
  })

  it('hides descendants of collapsed nodes', () => {
    const doc = makeDocument()
    const collapsedNode = doc.root.children[0]
    const hiddenNode = collapsedNode.children[0]
    collapsedNode.collapsed = true

    const layout = layoutDocument(doc)

    expect(layout.nodes).toHaveLength(3)
    expect(layout.byId.has(hiddenNode.id)).toBe(false)
  })

  it('creates connection paths with branch colors', () => {
    const layout = layoutDocument(makeDocument())

    for (const connection of layout.connections) {
      expect(connection.path).toMatch(/^M .* C /)
      expect(connection.color).toMatch(/^#/)
    }
  })

  it('mirrors the layout to the left for logic-left', () => {
    const doc = makeDocument()
    doc.structure = 'logic-left'
    const layout = layoutDocument(doc)
    const root = layout.byId.get(doc.root.id)
    if (!root) throw new Error('missing root')

    for (const child of root.children) {
      expect(child.x + child.width).toBe(root.x - H_GAP)
    }
  })

  it('places branches on both sides for logic-both', () => {
    const doc = makeDocument()
    doc.structure = 'logic-both'
    const layout = layoutDocument(doc)
    const root = layout.byId.get(doc.root.id)
    const a = layout.byId.get(doc.root.children[0].id)
    const b = layout.byId.get(doc.root.children[1].id)
    if (!root || !a || !b) throw new Error('missing layout nodes')

    expect(a.x).toBeGreaterThan(root.x + root.width)
    expect(b.x + b.width).toBeLessThan(root.x)
    expect(layout.connections).toHaveLength(3)
  })

  it('stacks children below their parent for org-down', () => {
    const doc = makeDocument()
    doc.structure = 'org-down'
    const layout = layoutDocument(doc)
    const root = layout.byId.get(doc.root.id)
    const a = layout.byId.get(doc.root.children[0].id)
    const b = layout.byId.get(doc.root.children[1].id)
    const a1 = layout.byId.get(doc.root.children[0].children[0].id)
    if (!root || !a || !b || !a1) throw new Error('missing layout nodes')

    expect(a.y).toBe(root.y + root.height + ORG_V_GAP)
    expect(b.y).toBe(a.y)
    expect(a1.y).toBe(a.y + a.height + ORG_V_GAP)
    expect(root.x + root.width / 2).toBeCloseTo(
      (Math.min(a.x, b.x) + Math.max(a.x + a.width, b.x + b.width)) / 2,
    )
    expect(layout.connections[0].path).toMatch(/^M .* C /)
  })

  it('applies the active theme palette to branches and connections', () => {
    const doc = makeDocument()
    const theme = resolveTheme('fresh')
    const layout = layoutDocument(doc, theme)
    const root = layout.byId.get(doc.root.id)
    if (!root) throw new Error('missing root')

    expect(root.branchColor).toBe(theme.rootFill)
    expect(root.children[0].branchColor).toBe(theme.branchPalette[0])
    expect(root.children[1].branchColor).toBe(theme.branchPalette[1])

    for (const child of root.children) {
      const connection = layout.connections.find((item) => item.childId === child.id)
      expect(connection?.color).toBe(child.branchColor)
    }
  })

  it('applies node font size and connection style overrides', () => {
    const baseDoc = makeDocument()
    const styledDoc = makeDocument()
    const styledChild = styledDoc.root.children[0]
    styledChild.style = {
      fontSize: 32,
      lineColor: '#123456',
      lineWidth: 5,
      lineStyle: 'dashed',
    }

    const baseLayout = layoutDocument(baseDoc)
    const styledLayout = layoutDocument(styledDoc)
    const baseChild = baseLayout.byId.get(baseDoc.root.children[0].id)
    const styledLayoutChild = styledLayout.byId.get(styledChild.id)
    const connection = styledLayout.connections.find((item) => item.childId === styledChild.id)
    if (!baseChild || !styledLayoutChild || !connection) throw new Error('missing layout nodes')

    expect(styledLayoutChild.height).toBeGreaterThan(baseChild.height)
    expect(styledLayoutChild.visual.fontSize).toBe(32)
    expect(connection.color).toBe('#123456')
    expect(connection.width).toBe(5)
    expect(connection.dasharray).toBe('7 5')
  })

  it('uses the default connection style when no override is set', () => {
    const layout = layoutDocument(makeDocument())
    const connection = layout.connections[0]

    expect(connection.width).toBe(2)
    expect(connection.dasharray).toBeUndefined()
  })
})
