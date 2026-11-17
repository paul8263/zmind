import type { Structure } from '@/domain/model/types'

import type { LayoutNode, LayoutResult } from './logical'

export type DropMode = 'child' | 'before' | 'after'
export type DropEdge = 'left' | 'right' | 'top' | 'bottom'

export interface DropTarget {
  nodeId: string
  mode: DropMode
  newParentId: string
  index: number
}

export interface DropResolveOptions {
  snapRadius?: number
}

export const DROP_SNAP_RADIUS = 24

interface DropCandidate {
  node: LayoutNode
  inside: boolean
  edge: DropEdge | null
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

function edgeDistance(node: LayoutNode, x: number, y: number, edge: DropEdge): number {
  if (edge === 'left' || edge === 'right') {
    const edgeX = edge === 'left' ? node.x : node.x + node.width
    const clampedY = Math.max(node.y, Math.min(y, node.y + node.height))
    return Math.hypot(x - edgeX, y - clampedY)
  }

  const edgeY = edge === 'top' ? node.y : node.y + node.height
  const clampedX = Math.max(node.x, Math.min(x, node.x + node.width))
  return Math.hypot(x - clampedX, y - edgeY)
}

function nearestEdge(node: LayoutNode, x: number, y: number): DropEdge {
  const edges: DropEdge[] = ['left', 'right', 'top', 'bottom']
  let best: DropEdge = 'left'
  let bestDistance = Number.POSITIVE_INFINITY

  for (const edge of edges) {
    const distance = edgeDistance(node, x, y, edge)
    if (distance < bestDistance) {
      best = edge
      bestDistance = distance
    }
  }

  return best
}

function distanceToRect(node: LayoutNode, x: number, y: number): number {
  const dx = Math.max(node.x - x, 0, x - (node.x + node.width))
  const dy = Math.max(node.y - y, 0, y - (node.y + node.height))
  return Math.hypot(dx, dy)
}

function isEligible(layout: LayoutResult, draggedId: string, node: LayoutNode): boolean {
  return node.id !== draggedId && !isDescendantOf(layout, draggedId, node.id)
}

function findDropCandidate(
  layout: LayoutResult,
  draggedId: string,
  x: number,
  y: number,
  snapRadius: number,
): DropCandidate | null {
  for (let index = layout.nodes.length - 1; index >= 0; index -= 1) {
    const node = layout.nodes[index]
    if (!contains(node, x, y)) continue

    if (!isEligible(layout, draggedId, node)) return null
    return { node, inside: true, edge: null }
  }

  let nearest: LayoutNode | null = null
  let nearestDistance = Number.POSITIVE_INFINITY

  for (const node of layout.nodes) {
    if (!isEligible(layout, draggedId, node)) continue

    const distance = distanceToRect(node, x, y)
    if (distance <= snapRadius && distance < nearestDistance) {
      nearest = node
      nearestDistance = distance
    }
  }

  if (!nearest) return null
  return { node: nearest, inside: false, edge: nearestEdge(nearest, x, y) }
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

function dropModeForPoint(
  node: LayoutNode,
  x: number,
  y: number,
  inside: boolean,
  edge: DropEdge | null,
  structure: Structure,
): DropMode {
  if (inside) {
    const horizontal = structure !== 'org-down'
    const ratio = horizontal
      ? (y - node.y) / Math.max(node.height, 1)
      : (x - node.x) / Math.max(node.width, 1)

    return ratio < 0.28 ? 'before' : ratio > 0.72 ? 'after' : 'child'
  }

  if (structure === 'org-down') {
    if (edge === 'left') return 'before'
    if (edge === 'right') return 'after'
    return 'child'
  }

  if (edge === 'top') return 'before'
  if (edge === 'bottom') return 'after'
  return 'child'
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
  options: DropResolveOptions = {},
): DropTarget | null {
  const dragged = layout.byId.get(draggedId)
  if (!dragged || !dragged.parentId) return null

  const candidate = findDropCandidate(
    layout,
    draggedId,
    x,
    y,
    Math.max(0, options.snapRadius ?? DROP_SNAP_RADIUS),
  )
  if (!candidate) return null

  const target = candidate.node
  if (!target.parentId) return childDropTarget(layout, target, draggedId)

  const mode = dropModeForPoint(target, x, y, candidate.inside, candidate.edge, structure)

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

  if (oldIndex >= 0 && index === oldIndex) {
    return null
  }

  return {
    nodeId: target.id,
    mode,
    newParentId: parent.id,
    index,
  }
}
