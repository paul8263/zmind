// @vitest-environment node

import { produce } from 'immer'
import { describe, expect, it } from 'vitest'

import { createBlankSheet, createTopic } from '@/domain/model/document'
import { findNode } from '@/domain/model/tree'

import {
  insertChild,
  insertSibling,
  moveNode,
  removeNode,
  renameNode,
  toggleCollapse,
} from './tree'

function makeDocument() {
  const doc = createBlankSheet()
  const a = createTopic('a')
  const b = createTopic('b')
  const a1 = createTopic('a1')

  a.children.push(a1)
  doc.root.children.push(a, b)

  return { doc, a, b, a1 }
}

describe('tree commands', () => {
  it('inserts a child and expands the parent', () => {
    const { doc, a } = makeDocument()
    const child = createTopic('new')
    a.collapsed = true

    const next = produce(doc, (draft) => {
      insertChild(draft, a.id, child)
    })

    const parent = findNode(next.root, a.id)
    expect(parent?.children.some((node) => node.id === child.id)).toBe(true)
    expect(parent?.collapsed).toBe(false)
  })

  it('inserts a sibling after the target', () => {
    const { doc, a, a1 } = makeDocument()
    const sibling = createTopic('sibling')

    const next = produce(doc, (draft) => {
      insertSibling(draft, a1.id, sibling)
    })

    const parent = findNode(next.root, a.id)
    expect(parent?.children.map((node) => node.title)).toEqual(['a1', 'sibling'])
  })

  it('removes a node and returns its parent id', () => {
    const { doc, a, a1 } = makeDocument()
    let parentId: string | null = null

    const next = produce(doc, (draft) => {
      parentId = removeNode(draft, a1.id)
    })

    expect(parentId).toBe(a.id)
    expect(findNode(next.root, a1.id)).toBeNull()
  })

  it('does not remove the root', () => {
    const { doc } = makeDocument()
    let parentId: string | null = null

    const next = produce(doc, (draft) => {
      parentId = removeNode(draft, draft.root.id)
    })

    expect(parentId).toBeNull()
    expect(next.root.title).toBe('中心主题')
  })

  it('renames a node', () => {
    const { doc, a1 } = makeDocument()

    const next = produce(doc, (draft) => {
      renameNode(draft, a1.id, 'renamed')
    })

    expect(findNode(next.root, a1.id)?.title).toBe('renamed')
  })

  it('toggles collapse only when children exist', () => {
    const { doc, a, b } = makeDocument()

    const next = produce(doc, (draft) => {
      toggleCollapse(draft, a.id)
      toggleCollapse(draft, b.id)
    })

    expect(findNode(next.root, a.id)?.collapsed).toBe(true)
    expect(findNode(next.root, b.id)?.collapsed).toBe(false)
  })

  it('moves a node to a new parent', () => {
    const { doc, a, b, a1 } = makeDocument()

    const next = produce(doc, (draft) => {
      moveNode(draft, a1.id, b.id, 0)
    })

    expect(findNode(next.root, a.id)?.children).toHaveLength(0)
    expect(findNode(next.root, b.id)?.children[0]?.id).toBe(a1.id)
  })

  it('reorders siblings within the same parent using the final index', () => {
    const { doc, a, b } = makeDocument()
    const c = createTopic('c')
    doc.root.children.push(c)

    const next = produce(doc, (draft) => {
      moveNode(draft, a.id, draft.root.id, 2)
    })

    expect(next.root.children.map((node) => node.title)).toEqual([b.title, c.title, a.title])
  })

  it('rejects moving a node into its own descendant', () => {
    const { doc, a, a1 } = makeDocument()

    const next = produce(doc, (draft) => {
      moveNode(draft, a.id, a1.id, 0)
    })

    expect(next.root.children[0].id).toBe(a.id)
    expect(findNode(next.root, a.id)?.children[0]?.id).toBe(a1.id)
  })
})
