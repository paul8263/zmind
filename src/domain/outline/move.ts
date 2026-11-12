import { findNode, findParent } from '@/domain/model/tree'
import type { MindMapDocument } from '@/domain/model/types'

export type OutlineMoveAction = 'up' | 'down' | 'promote' | 'demote'

export interface OutlineMoveTarget {
  newParentId: string
  index: number
}

export function resolveOutlineMove(
  doc: MindMapDocument,
  nodeId: string,
  action: OutlineMoveAction,
): OutlineMoveTarget | null {
  if (nodeId === doc.root.id) return null

  const node = findNode(doc.root, nodeId)
  const parent = findParent(doc.root, nodeId)
  if (!node || !parent) return null

  const index = parent.children.findIndex((child) => child.id === nodeId)
  if (index < 0) return null

  if (action === 'up') {
    return index > 0 ? { newParentId: parent.id, index: index - 1 } : null
  }

  if (action === 'down') {
    return index < parent.children.length - 1 ? { newParentId: parent.id, index: index + 1 } : null
  }

  if (action === 'demote') {
    const previous = parent.children[index - 1]
    return previous ? { newParentId: previous.id, index: previous.children.length } : null
  }

  const grandparent = findParent(doc.root, parent.id)
  if (!grandparent) return null

  const parentIndex = grandparent.children.findIndex((child) => child.id === parent.id)
  if (parentIndex < 0) return null

  return { newParentId: grandparent.id, index: parentIndex + 1 }
}
