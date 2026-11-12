import { findNode, findParent, isDescendant } from '@/domain/model/tree'
import type { MindMapDocument } from '@/domain/model/types'

export type OutlineDropMode = 'before' | 'after' | 'child'

export interface OutlineDropTarget {
  mode: OutlineDropMode
  newParentId: string
  index: number
}

/**
 * `index` follows the tree command's semantics: it is the final position after
 * the dragged node has been removed from its old parent.
 */
export function resolveOutlineDrop(
  doc: MindMapDocument,
  draggedId: string,
  targetId: string,
  mode: OutlineDropMode,
): OutlineDropTarget | null {
  if (draggedId === doc.root.id || draggedId === targetId) return null
  if (isDescendant(doc.root, draggedId, targetId)) return null

  const dragged = findNode(doc.root, draggedId)
  const target = findNode(doc.root, targetId)
  if (!dragged || !target) return null

  // The root has no siblings, so any drop on its row nests the node instead.
  const resolvedMode: OutlineDropMode = targetId === doc.root.id ? 'child' : mode

  if (resolvedMode === 'child') {
    const parent = findParent(doc.root, draggedId)
    if (parent?.id === target.id) {
      const oldIndex = target.children.findIndex((child) => child.id === draggedId)
      if (oldIndex === target.children.length - 1) return null
    }

    return { mode: 'child', newParentId: target.id, index: target.children.length }
  }

  const parent = findParent(doc.root, targetId)
  if (!parent) return null

  const targetIndex = parent.children.findIndex((child) => child.id === targetId)
  if (targetIndex < 0) return null

  const baseIndex = targetIndex + (resolvedMode === 'after' ? 1 : 0)
  const draggedParent = findParent(doc.root, draggedId)
  const oldIndex =
    draggedParent?.id === parent.id
      ? parent.children.findIndex((child) => child.id === draggedId)
      : -1
  const index = oldIndex >= 0 && oldIndex < baseIndex ? baseIndex - 1 : baseIndex

  if (oldIndex >= 0 && index === oldIndex) return null

  return { mode: resolvedMode, newParentId: parent.id, index }
}
