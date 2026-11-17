import { produce } from 'immer'

import { moveNode } from '@/domain/commands/tree'
import type { MindMapSheet } from '@/domain/model/types'
import type { MindMapTheme } from '@/domain/theme'

import type { DropTarget } from './drop'
import { layoutDocument, type LayoutNode, type LayoutResult } from './logical'

export interface DropPreview {
  layout: LayoutResult
  ghost: LayoutNode
  target: DropTarget
}

export function buildDropPreview(
  doc: MindMapSheet,
  theme: MindMapTheme,
  draggedId: string,
  target: DropTarget,
): DropPreview | null {
  let moved = false
  const previewDoc = produce(doc, (draft) => {
    moved = moveNode(draft, draggedId, target.newParentId, target.index)
  })

  if (!moved) return null

  const layout = layoutDocument(previewDoc, theme)
  const ghost = layout.byId.get(draggedId)
  if (!ghost) return null

  return { layout, ghost, target }
}
