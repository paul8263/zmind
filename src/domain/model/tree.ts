import type { TopicNode } from './types'

export function findNode(root: TopicNode, id: string): TopicNode | null {
  if (root.id === id) return root

  for (const child of root.children) {
    const found = findNode(child, id)
    if (found) return found
  }

  return null
}

export function findParent(root: TopicNode, id: string): TopicNode | null {
  for (const child of root.children) {
    if (child.id === id) return root

    const found = findParent(child, id)
    if (found) return found
  }

  return null
}

export function isDescendant(root: TopicNode, ancestorId: string, nodeId: string): boolean {
  const ancestor = findNode(root, ancestorId)
  if (!ancestor) return false

  return findNode(ancestor, nodeId) !== null
}
