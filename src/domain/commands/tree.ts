import { findNode, findParent, isDescendant } from '@/domain/model/tree'
import type { MindMapDocument, TopicNode } from '@/domain/model/types'

export function insertChild(draft: MindMapDocument, parentId: string, child: TopicNode): boolean {
  const parent = findNode(draft.root, parentId)
  if (!parent) return false

  parent.children.push(child)
  parent.collapsed = false
  return true
}

export function insertSibling(draft: MindMapDocument, nodeId: string, sibling: TopicNode): boolean {
  const parent = findParent(draft.root, nodeId)
  if (!parent) return false

  const index = parent.children.findIndex((child) => child.id === nodeId)
  if (index < 0) return false

  parent.children.splice(index + 1, 0, sibling)
  return true
}

export function removeNode(draft: MindMapDocument, nodeId: string): string | null {
  if (draft.root.id === nodeId) return null

  const parent = findParent(draft.root, nodeId)
  if (!parent) return null

  const index = parent.children.findIndex((child) => child.id === nodeId)
  if (index < 0) return null

  parent.children.splice(index, 1)
  return parent.id
}

export function renameNode(draft: MindMapDocument, nodeId: string, title: string): boolean {
  const node = findNode(draft.root, nodeId)
  if (!node) return false

  node.title = title
  return true
}

export function toggleCollapse(draft: MindMapDocument, nodeId: string): boolean {
  const node = findNode(draft.root, nodeId)
  if (!node || node.children.length === 0) return false

  node.collapsed = !node.collapsed
  return true
}

export function moveNode(
  draft: MindMapDocument,
  nodeId: string,
  newParentId: string,
  index: number,
): boolean {
  if (nodeId === draft.root.id || nodeId === newParentId) return false
  if (isDescendant(draft.root, nodeId, newParentId)) return false

  const node = findNode(draft.root, nodeId)
  const oldParent = findParent(draft.root, nodeId)
  const newParent = findNode(draft.root, newParentId)
  if (!node || !oldParent || !newParent) return false

  const oldIndex = oldParent.children.findIndex((child) => child.id === nodeId)
  if (oldIndex < 0) return false

  oldParent.children.splice(oldIndex, 1)
  const targetIndex = Math.max(0, Math.min(index, newParent.children.length))
  newParent.children.splice(targetIndex, 0, node)
  newParent.collapsed = false
  return true
}
