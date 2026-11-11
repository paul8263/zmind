// @vitest-environment node

import { describe, expect, it } from 'vitest'

import { createTopic } from './document'
import { findNode, findParent, isDescendant } from './tree'

function makeTree() {
  const root = createTopic('root')
  const a = createTopic('a')
  const b = createTopic('b')
  const a1 = createTopic('a1')

  a.children.push(a1)
  root.children.push(a, b)

  return { root, a, b, a1 }
}

describe('tree utilities', () => {
  it('finds nodes by id', () => {
    const { root, a, a1 } = makeTree()

    expect(findNode(root, root.id)).toBe(root)
    expect(findNode(root, a.id)).toBe(a)
    expect(findNode(root, a1.id)).toBe(a1)
    expect(findNode(root, 'missing')).toBeNull()
  })

  it('finds parents', () => {
    const { root, a, a1 } = makeTree()

    expect(findParent(root, a.id)).toBe(root)
    expect(findParent(root, a1.id)).toBe(a)
    expect(findParent(root, root.id)).toBeNull()
    expect(findParent(root, 'missing')).toBeNull()
  })

  it('detects descendants', () => {
    const { root, a, b, a1 } = makeTree()

    expect(isDescendant(root, a.id, a1.id)).toBe(true)
    expect(isDescendant(root, a.id, a.id)).toBe(true)
    expect(isDescendant(root, a.id, b.id)).toBe(false)
    expect(isDescendant(root, root.id, a1.id)).toBe(true)
    expect(isDescendant(root, 'missing', a.id)).toBe(false)
  })
})
