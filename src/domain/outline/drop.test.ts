import { describe, expect, it } from 'vitest'

import { createBlankDocument, createTopic } from '@/domain/model/document'

import { resolveOutlineDrop } from './drop'

function makeDoc() {
  const doc = createBlankDocument()
  const a = createTopic('A')
  const b = createTopic('B')
  const c = createTopic('C')
  const a1 = createTopic('A1')
  a.children.push(a1)
  b.children.push(createTopic('B1'), createTopic('B2'))
  doc.root.children.push(a, b, c)

  return { doc, a, b, c, a1 }
}

describe('resolveOutlineDrop', () => {
  it('moves a node after a later sibling', () => {
    const { doc, a, b } = makeDoc()

    expect(resolveOutlineDrop(doc, a.id, b.id, 'after')).toEqual({
      mode: 'after',
      newParentId: doc.root.id,
      index: 1,
    })
  })

  it('moves a node before an earlier sibling', () => {
    const { doc, a, c } = makeDoc()

    expect(resolveOutlineDrop(doc, c.id, a.id, 'before')).toEqual({
      mode: 'before',
      newParentId: doc.root.id,
      index: 0,
    })
  })

  it('ignores drops that would not change the order', () => {
    const { doc, a, b, c } = makeDoc()

    expect(resolveOutlineDrop(doc, a.id, b.id, 'before')).toBeNull()
    expect(resolveOutlineDrop(doc, b.id, c.id, 'before')).toBeNull()
    expect(resolveOutlineDrop(doc, b.id, a.id, 'after')).toBeNull()
  })

  it('nests a node when dropped on another row', () => {
    const { doc, a1, c } = makeDoc()

    expect(resolveOutlineDrop(doc, a1.id, c.id, 'child')).toEqual({
      mode: 'child',
      newParentId: c.id,
      index: 0,
    })
  })

  it('ignores nesting a node that is already the last child', () => {
    const { doc, b } = makeDoc()

    expect(resolveOutlineDrop(doc, b.children[1].id, b.id, 'child')).toBeNull()
  })

  it('rejects dropping a node into its own descendant', () => {
    const { doc, a, a1 } = makeDoc()

    expect(resolveOutlineDrop(doc, a.id, a1.id, 'child')).toBeNull()
  })

  it('rejects dragging the root', () => {
    const { doc, a } = makeDoc()

    expect(resolveOutlineDrop(doc, doc.root.id, a.id, 'child')).toBeNull()
  })

  it('nests nodes dropped on the root row', () => {
    const { doc, a } = makeDoc()

    expect(resolveOutlineDrop(doc, a.id, doc.root.id, 'before')).toEqual({
      mode: 'child',
      newParentId: doc.root.id,
      index: 3,
    })
  })
})
