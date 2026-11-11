import type { Structure } from '@/domain/model/types'

import type { LayoutNode, LayoutResult } from './logical'

export type DropMode = 'child' | 'before' | 'after'

export interface DropTarget {
  nodeId: string
  mode: DropMode
  newParentId: string
  index: number
}

function contains(node: LayoutNode, x: number, y: number): boolean {
  return x >= node.x && x <= node.x + node.width && y >= node.y && y <= node.y + node.height
}

function isDescendantOf(layout: LayoutResult, ancestorId: string, nodeId: string): boolean {
  let current = layout.byId.get(nodeId)?.parentId ?? null

  while (current) {
    if (current === ancestorId) return true
    current = layout.byId.get(current)?.parentId ?? null
  }

  return false
}

function childDropTarget(
  layout: LayoutResult,
  target: LayoutNode,
  draggedId: string,
): DropTarget | null {
  const dragged = layout.byId.get(draggedId)
  const index = target.node.children.length

  if (dragged?.parentId === target.id) {
    const oldIndex = target.children.findIndex((child) => child.id === draggedId)
    if (oldIndex === index - 1) return null
  }

  return {
    nodeId: target.id,
    mode: 'child',
    newParentId: target.id,
    index,
  }
}

/**
 * `index` is the final position after the dragged node has been removed from its
 * old parent, matching the tree command's semantics.
 */
export function resolveDropTarget(
  layout: LayoutResult,
  draggedId: string,
  x: number,
  y: number,
  structure: Structure,
): DropTarget | null {
  const dragged = layout.byId.get(draggedId)
  if (!dragged || !dragged.parentId) return null

  let target: LayoutNode | undefined
  for (let index = layout.nodes.length - 1; index >= 0; index -= 1) {
    if (contains(layout.nodes[index], x, y)) {
      target = layout.nodes[index]
      break
    }
  }

  if (!target || target.id === draggedId) return null
  if (isDescendantOf(layout, draggedId, target.id)) return null
  if (!target.parentId) return childDropTarget(layout, target, draggedId)

  const horizontal = structure !== 'org-down'
  const ratio = horizontal
    ? (y - target.y) / Math.max(target.height, 1)
    : (x - target.x) / Math.max(target.width, 1)

  const mode: DropMode = ratio < 0.28 ? 'before' : ratio > 0.72 ? 'after' : 'child'

  if (mode === 'child') return childDropTarget(layout, target, draggedId)

  const parent = layout.byId.get(target.parentId)
  if (!parent) return null

  const targetIndex = parent.children.findIndex((child) => child.id === target.id)
  if (targetIndex < 0) return null

  const baseIndex = targetIndex + (mode === 'after' ? 1 : 0)
  const oldIndex =
    dragged.parentId === parent.id
      ? parent.children.findIndex((child) => child.id === draggedId)
      : -1
  const index = oldIndex >= 0 && oldIndex < baseIndex ? baseIndex - 1 : baseIndex

  if (oldIndex >= 0 && (index === oldIndex || index === oldIndex + 1)) {
    return null
  }

  return {
    nodeId: target.id,
    mode,
    newParentId: parent.id,
    index,
  }
}
