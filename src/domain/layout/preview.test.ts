// @vitest-environment node

import { describe, expect, it } from 'vitest'

import { createBlankSheet, createTopic } from '@/domain/model/document'
import { resolveTheme } from '@/domain/theme'

import { layoutDocument } from './logical'
import { buildDropPreview } from './preview'

function makeDocument() {
  const doc = createBlankSheet()
  const a = createTopic('a')
  const b = createTopic('b')
  const a1 = createTopic('a1')
  const a2 = createTopic('a2')
  a.children.push(a1, a2)
  doc.root.children.push(a, b)
  return { doc, a, b, a1 }
}

const theme = resolveTheme('classic')

describe('drop preview', () => {
  it('moves the dragged node into the target position in a temporary layout', () => {
    const { doc, b, a1 } = makeDocument()

    const preview = buildDropPreview(doc, theme, a1.id, {
      nodeId: b.id,
      mode: 'child',
      newParentId: b.id,
      index: 0,
    })

    expect(preview).not.toBeNull()
    expect(preview?.ghost.id).toBe(a1.id)
    expect(preview?.ghost.parentId).toBe(b.id)
    expect(preview?.layout.byId.get(a1.id)?.parentId).toBe(b.id)
  })

  it('reflows surrounding nodes to make room', () => {
    const { doc, b, a1 } = makeDocument()
    const before = layoutDocument(doc, theme)
    const originalB = before.byId.get(b.id)
    if (!originalB) throw new Error('missing original sibling')

    const preview = buildDropPreview(doc, theme, a1.id, {
      nodeId: b.id,
      mode: 'child',
      newParentId: b.id,
      index: 0,
    })

    expect(preview).not.toBeNull()
    expect(preview?.layout.byId.get(b.id)?.y).toBeLessThan(originalB.y)
  })

  it('expands a collapsed target parent in the preview', () => {
    const { doc, b, a1 } = makeDocument()
    const b1 = createTopic('b1')
    b.children.push(b1)
    b.collapsed = true

    const preview = buildDropPreview(doc, theme, a1.id, {
      nodeId: b.id,
      mode: 'child',
      newParentId: b.id,
      index: 0,
    })

    expect(preview).not.toBeNull()
    expect(preview?.layout.byId.has(b1.id)).toBe(true)
    expect(preview?.layout.byId.has(a1.id)).toBe(true)
  })

  it('returns null for an invalid target and leaves the document untouched', () => {
    const { doc, a, a1 } = makeDocument()

    const preview = buildDropPreview(doc, theme, a.id, {
      nodeId: a1.id,
      mode: 'child',
      newParentId: a1.id,
      index: 0,
    })

    expect(preview).toBeNull()
    expect(doc.root.children).toHaveLength(2)
    expect(a.children).toHaveLength(2)
  })
})
