import type { Structure } from '@/domain/model/types'

import type { LayoutNode, LayoutResult, Rect } from './logical'

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
export const DROP_GAP_PADDING = 8

interface DropCandidate {
  node: LayoutNode
  inside: boolean
  edge: DropEdge | null
}

interface GapCandidate {
  parent: LayoutNode
  target: LayoutNode
  distance: number
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

function isEligible(layout: LayoutResult, draggedId: string, node: LayoutNode): boolean {
  return node.id !== draggedId && !isDescendantOf(layout, draggedId, node.id)
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

function findInsideNode(layout: LayoutResult, x: number, y: number): LayoutNode | null {
  for (let index = layout.nodes.length - 1; index >= 0; index -= 1) {
    const node = layout.nodes[index]
    if (contains(node, x, y)) return node
  }

  return null
}

function findNearestNode(
  layout: LayoutResult,
  draggedId: string,
  x: number,
  y: number,
  snapRadius: number,
): DropCandidate | null {
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

function subtreeBounds(node: LayoutNode, cache: Map<string, Rect>): Rect {
  const cached = cache.get(node.id)
  if (cached) return cached

  let minX = node.x
  let minY = node.y
  let maxX = node.x + node.width
  let maxY = node.y + node.height

  for (const child of node.children) {
    const bounds = subtreeBounds(child, cache)
    minX = Math.min(minX, bounds.x)
    minY = Math.min(minY, bounds.y)
    maxX = Math.max(maxX, bounds.x + bounds.width)
    maxY = Math.max(maxY, bounds.y + bounds.height)
  }

  const result = { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
  cache.set(node.id, result)
  return result
}

function siblingGroups(parent: LayoutNode, structure: Structure): LayoutNode[][] {
  if (structure === 'org-down') {
    return [[...parent.children].sort((left, right) => left.x - right.x)]
  }

  const center = parent.x + parent.width / 2
  const left = parent.children
    .filter((child) => child.x + child.width / 2 < center)
    .sort((first, second) => first.y - second.y)
  const right = parent.children
    .filter((child) => child.x + child.width / 2 >= center)
    .sort((first, second) => first.y - second.y)

  return [left, right].filter((group) => group.length >= 2)
}

function gapBand(
  first: LayoutNode,
  second: LayoutNode,
  structure: Structure,
  cache: Map<string, Rect>,
): Rect | null {
  const firstBounds = subtreeBounds(first, cache)
  const secondBounds = subtreeBounds(second, cache)

  if (structure === 'org-down') {
    const left = first.x + first.width
    const right = second.x
    if (right <= left) return null

    const top = Math.min(firstBounds.y, secondBounds.y) - DROP_GAP_PADDING
    const bottom =
      Math.max(firstBounds.y + firstBounds.height, secondBounds.y + secondBounds.height) +
      DROP_GAP_PADDING

    return {
      x: left - DROP_GAP_PADDING,
      y: top,
      width: right - left + DROP_GAP_PADDING * 2,
      height: bottom - top,
    }
  }

  const top = first.y + first.height
  const bottom = second.y
  if (bottom <= top) return null

  const left = Math.min(firstBounds.x, secondBounds.x) - DROP_GAP_PADDING
  const right =
    Math.max(firstBounds.x + firstBounds.width, secondBounds.x + secondBounds.width) +
    DROP_GAP_PADDING

  return {
    x: left,
    y: top - DROP_GAP_PADDING,
    width: right - left,
    height: bottom - top + DROP_GAP_PADDING * 2,
  }
}

function findGapDropTarget(
  layout: LayoutResult,
  draggedId: string,
  x: number,
  y: number,
  structure: Structure,
): DropTarget | null {
  const boundsCache = new Map<string, Rect>()
  const candidates: GapCandidate[] = []

  for (const parent of layout.nodes) {
    if (parent.children.length < 2) continue
    if (parent.id === draggedId || isDescendantOf(layout, draggedId, parent.id)) continue

    for (const group of siblingGroups(parent, structure)) {
      for (let index = 0; index < group.length - 1; index += 1) {
        const band = gapBand(group[index], group[index + 1], structure, boundsCache)
        if (!band) continue
        if (x < band.x || x > band.x + band.width) continue
        if (y < band.y || y > band.y + band.height) continue

        candidates.push({
          parent,
          target: group[index + 1],
          distance: Math.hypot(x - (band.x + band.width / 2), y - (band.y + band.height / 2)),
        })
      }
    }
  }

  candidates.sort((first, second) => first.distance - second.distance)

  for (const candidate of candidates) {
    const target = siblingDropTarget(
      layout,
      draggedId,
      candidate.parent,
      candidate.target,
      'before',
    )
    if (target) return target
  }

  return null
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

function siblingDropTarget(
  layout: LayoutResult,
  draggedId: string,
  parent: LayoutNode,
  target: LayoutNode,
  mode: 'before' | 'after',
): DropTarget | null {
  const dragged = layout.byId.get(draggedId)
  const targetIndex = parent.children.findIndex((child) => child.id === target.id)
  if (targetIndex < 0) return null

  const baseIndex = targetIndex + (mode === 'after' ? 1 : 0)
  const oldIndex =
    dragged?.parentId === parent.id
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

function resolveNodeTarget(
  layout: LayoutResult,
  draggedId: string,
  target: LayoutNode,
  x: number,
  y: number,
  structure: Structure,
  inside: boolean,
  edge: DropEdge | null,
): DropTarget | null {
  if (!target.parentId) return childDropTarget(layout, target, draggedId)

  const mode = dropModeForPoint(target, x, y, inside, edge, structure)
  if (mode === 'child') return childDropTarget(layout, target, draggedId)

  const parent = layout.byId.get(target.parentId)
  if (!parent) return null

  return siblingDropTarget(layout, draggedId, parent, target, mode)
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

  const inside = findInsideNode(layout, x, y)
  if (inside) {
    if (!isEligible(layout, draggedId, inside)) return null
    return resolveNodeTarget(layout, draggedId, inside, x, y, structure, true, null)
  }

  const gapTarget = findGapDropTarget(layout, draggedId, x, y, structure)
  if (gapTarget) return gapTarget

  const candidate = findNearestNode(
    layout,
    draggedId,
    x,
    y,
    Math.max(0, options.snapRadius ?? DROP_SNAP_RADIUS),
  )
  if (!candidate) return null

  return resolveNodeTarget(
    layout,
    draggedId,
    candidate.node,
    x,
    y,
    structure,
    candidate.inside,
    candidate.edge,
  )
}
