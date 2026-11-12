import { describe, expect, it } from 'vitest'

import { createBlankDocument, createTopic } from '@/domain/model/document'

import { resolveOutlineMove } from './move'

function makeDoc() {
  const doc = createBlankDocument()
  const a = createTopic('A')
  const b = createTopic('B')
  const c = createTopic('C')
  const a1 = createTopic('A1')
  const a2 = createTopic('A2')
  a.children.push(a1, a2)
  b.children.push(createTopic('B1'))
  doc.root.children.push(a, b, c)

  return { doc, a, b, c, a1, a2 }
}

describe('resolveOutlineMove', () => {
  it('moves a node up and down among its siblings', () => {
    const { doc, b } = makeDoc()

    expect(resolveOutlineMove(doc, b.id, 'up')).toEqual({
      newParentId: doc.root.id,
      index: 0,
    })
    expect(resolveOutlineMove(doc, b.id, 'down')).toEqual({
      newParentId: doc.root.id,
      index: 2,
    })
  })

  it('disables moving past the first or last sibling', () => {
    const { doc, a, c } = makeDoc()

    expect(resolveOutlineMove(doc, a.id, 'up')).toBeNull()
    expect(resolveOutlineMove(doc, c.id, 'down')).toBeNull()
  })

  it('promotes a node to just after its parent', () => {
    const { doc, a1 } = makeDoc()

    expect(resolveOutlineMove(doc, a1.id, 'promote')).toEqual({
      newParentId: doc.root.id,
      index: 1,
    })
  })

  it('cannot promote a first-level node', () => {
    const { doc, a } = makeDoc()

    expect(resolveOutlineMove(doc, a.id, 'promote')).toBeNull()
  })

  it('demotes a node under its previous sibling', () => {
    const { doc, a1, a2 } = makeDoc()

    expect(resolveOutlineMove(doc, a2.id, 'demote')).toEqual({
      newParentId: a1.id,
      index: 0,
    })
  })

  it('cannot demote the first sibling', () => {
    const { doc, a1 } = makeDoc()

    expect(resolveOutlineMove(doc, a1.id, 'demote')).toBeNull()
  })

  it('rejects the root', () => {
    const { doc } = makeDoc()

    expect(resolveOutlineMove(doc, doc.root.id, 'up')).toBeNull()
  })
})
