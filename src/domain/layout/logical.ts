import type { MindMapDocument, Structure, TopicNode } from '@/domain/model/types'
import { CLASSIC_THEME, type MindMapTheme } from '@/domain/theme'

import { measureNodeSize } from './measure'
import type { NodeVisualStyle } from './style'

export const H_GAP = 64
export const V_GAP = 18
export const ORG_V_GAP = 56
export const ORG_H_GAP = 32

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface LayoutNode {
  id: string
  node: TopicNode
  x: number
  y: number
  width: number
  height: number
  depth: number
  parentId: string | null
  children: LayoutNode[]
  branchColor: string
  visual: NodeVisualStyle
}

export interface Connection {
  id: string
  parentId: string
  childId: string
  path: string
  color: string
  width: number
  dasharray?: string
  bounds: Rect
}

export interface LayoutResult {
  nodes: LayoutNode[]
  connections: Connection[]
  byId: Map<string, LayoutNode>
  bounds: Rect
}

type Orientation = 'horizontal' | 'vertical'
type HorizontalDirection = 'right' | 'left'

interface MeasuredNode {
  node: TopicNode
  width: number
  height: number
  subtreeWidth: number
  subtreeHeight: number
  visual: NodeVisualStyle
  children: MeasuredNode[]
}

function childrenBlockHeight(children: MeasuredNode[]): number {
  return (
    children.reduce((sum, child) => sum + child.subtreeHeight, 0) +
    Math.max(0, children.length - 1) * V_GAP
  )
}

function childrenBlockWidth(children: MeasuredNode[]): number {
  return (
    children.reduce((sum, child) => sum + child.subtreeWidth, 0) +
    Math.max(0, children.length - 1) * ORG_H_GAP
  )
}

function measureSubtree(node: TopicNode, depth: number, orientation: Orientation): MeasuredNode {
  const size = measureNodeSize(node.title, depth, node.style)
  const children = node.collapsed
    ? []
    : node.children.map((child) => measureSubtree(child, depth + 1, orientation))

  if (orientation === 'vertical') {
    const blockWidth = childrenBlockWidth(children)
    const maxChildHeight = children.length
      ? Math.max(...children.map((child) => child.subtreeHeight))
      : 0

    return {
      node,
      width: size.width,
      height: size.height,
      visual: size.visual,
      subtreeWidth: Math.max(size.width, blockWidth),
      subtreeHeight: size.height + (children.length ? ORG_V_GAP + maxChildHeight : 0),
      children,
    }
  }

  const blockHeight = childrenBlockHeight(children)
  const maxChildWidth = children.length
    ? Math.max(...children.map((child) => child.subtreeWidth))
    : 0

  return {
    node,
    width: size.width,
    height: size.height,
    visual: size.visual,
    subtreeWidth: size.width + (children.length ? H_GAP + maxChildWidth : 0),
    subtreeHeight: Math.max(size.height, blockHeight),
    children,
  }
}

function createLayoutNode(
  measured: MeasuredNode,
  x: number,
  y: number,
  depth: number,
  parentId: string | null,
  branchColor: string,
): LayoutNode {
  return {
    id: measured.node.id,
    node: measured.node,
    x,
    y,
    width: measured.width,
    height: measured.height,
    depth,
    parentId,
    children: [],
    branchColor,
    visual: measured.visual,
  }
}

function childColor(
  depth: number,
  index: number,
  branchColor: string,
  theme: MindMapTheme,
): string {
  return depth === 0 ? theme.branchPalette[index % theme.branchPalette.length] : branchColor
}

function placeHorizontal(
  measured: MeasuredNode,
  left: number,
  top: number,
  depth: number,
  parentId: string | null,
  branchColor: string,
  direction: HorizontalDirection,
  theme: MindMapTheme,
  nodes: LayoutNode[],
): LayoutNode {
  const x = direction === 'right' ? left : left + measured.subtreeWidth - measured.width
  const y = top + (measured.subtreeHeight - measured.height) / 2
  const layoutNode = createLayoutNode(measured, x, y, depth, parentId, branchColor)
  nodes.push(layoutNode)

  const blockHeight = childrenBlockHeight(measured.children)
  let childTop = top + (measured.subtreeHeight - blockHeight) / 2
  const childLeft = direction === 'right' ? x + measured.width + H_GAP : x - H_GAP

  for (let index = 0; index < measured.children.length; index += 1) {
    const child = measured.children[index]
    const color = childColor(depth, index, branchColor, theme)
    const childAnchor = direction === 'right' ? childLeft : childLeft - child.subtreeWidth

    layoutNode.children.push(
      placeHorizontal(
        child,
        childAnchor,
        childTop,
        depth + 1,
        measured.node.id,
        color,
        direction,
        theme,
        nodes,
      ),
    )
    childTop += child.subtreeHeight + V_GAP
  }

  return layoutNode
}

function placeVertical(
  measured: MeasuredNode,
  left: number,
  top: number,
  depth: number,
  parentId: string | null,
  branchColor: string,
  theme: MindMapTheme,
  nodes: LayoutNode[],
): LayoutNode {
  const x = left + (measured.subtreeWidth - measured.width) / 2
  const layoutNode = createLayoutNode(measured, x, top, depth, parentId, branchColor)
  nodes.push(layoutNode)

  const blockWidth = childrenBlockWidth(measured.children)
  let childLeft = left + (measured.subtreeWidth - blockWidth) / 2
  const childTop = top + measured.height + ORG_V_GAP

  for (let index = 0; index < measured.children.length; index += 1) {
    const child = measured.children[index]
    const color = childColor(depth, index, branchColor, theme)

    layoutNode.children.push(
      placeVertical(child, childLeft, childTop, depth + 1, measured.node.id, color, theme, nodes),
    )
    childLeft += child.subtreeWidth + ORG_H_GAP
  }

  return layoutNode
}

function connectionBounds(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  curve: number,
): Rect {
  const pad = curve + 8
  return {
    x: Math.min(startX, endX) - pad,
    y: Math.min(startY, endY) - pad,
    width: Math.abs(endX - startX) + pad * 2,
    height: Math.abs(endY - startY) + pad * 2,
  }
}

function createConnection(parent: LayoutNode, child: LayoutNode, structure: Structure): Connection {
  const id = `${parent.id}->${child.id}`
  const lineStyle = child.node.style?.lineStyle
  const color = child.node.style?.lineColor ?? child.branchColor
  const width = child.node.style?.lineWidth ?? 2
  const dasharray = lineStyle === 'dashed' ? '7 5' : lineStyle === 'dotted' ? '2 4' : undefined

  if (structure === 'org-down') {
    const startX = parent.x + parent.width / 2
    const startY = parent.y + parent.height
    const endX = child.x + child.width / 2
    const endY = child.y
    const curve = Math.max((endY - startY) * 0.4, 20)

    return {
      id,
      parentId: parent.id,
      childId: child.id,
      color,
      width,
      dasharray,
      bounds: connectionBounds(startX, startY, endX, endY, curve),
      path: `M ${startX} ${startY} C ${startX} ${startY + curve}, ${endX} ${endY - curve}, ${endX} ${endY}`,
    }
  }

  const leftward = child.x + child.width / 2 < parent.x + parent.width / 2
  const startX = leftward ? parent.x : parent.x + parent.width
  const startY = parent.y + parent.height / 2
  const endX = leftward ? child.x + child.width : child.x
  const endY = child.y + child.height / 2
  const curve = Math.max(Math.abs(endX - startX) * 0.5, 24)

  return {
    id,
    parentId: parent.id,
    childId: child.id,
    color,
    width,
    dasharray,
    bounds: connectionBounds(startX, startY, endX, endY, curve),
    path: leftward
      ? `M ${startX} ${startY} C ${startX - curve} ${startY}, ${endX + curve} ${endY}, ${endX} ${endY}`
      : `M ${startX} ${startY} C ${startX + curve} ${startY}, ${endX - curve} ${endY}, ${endX} ${endY}`,
  }
}

function finishLayout(nodes: LayoutNode[], structure: Structure): LayoutResult {
  const byId = new Map(nodes.map((node) => [node.id, node]))

  for (const layoutNode of nodes) {
    layoutNode.children = layoutNode.node.collapsed
      ? []
      : layoutNode.node.children
          .map((child) => byId.get(child.id))
          .filter((child): child is LayoutNode => Boolean(child))
  }

  const connections = nodes
    .filter((node) => node.parentId !== null)
    .map((node) =>
      createConnection(byId.get(node.parentId as string) as LayoutNode, node, structure),
    )

  const minX = Math.min(...nodes.map((node) => node.x))
  const minY = Math.min(...nodes.map((node) => node.y))
  const maxX = Math.max(...nodes.map((node) => node.x + node.width))
  const maxY = Math.max(...nodes.map((node) => node.y + node.height))

  return {
    nodes,
    connections,
    byId,
    bounds: {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    },
  }
}

function layoutHorizontal(
  doc: MindMapDocument,
  direction: HorizontalDirection,
  theme: MindMapTheme,
): LayoutResult {
  const measured = measureSubtree(doc.root, 0, 'horizontal')
  const nodes: LayoutNode[] = []
  placeHorizontal(measured, 0, 0, 0, null, theme.rootFill, direction, theme, nodes)
  return finishLayout(nodes, doc.structure)
}

function layoutVertical(doc: MindMapDocument, theme: MindMapTheme): LayoutResult {
  const measured = measureSubtree(doc.root, 0, 'vertical')
  const nodes: LayoutNode[] = []
  placeVertical(measured, 0, 0, 0, null, theme.rootFill, theme, nodes)
  return finishLayout(nodes, doc.structure)
}

function layoutBoth(doc: MindMapDocument, theme: MindMapTheme): LayoutResult {
  const measured = measureSubtree(doc.root, 0, 'horizontal')
  const rightChildren: MeasuredNode[] = []
  const leftChildren: MeasuredNode[] = []
  let rightHeight = 0
  let leftHeight = 0

  for (const child of measured.children) {
    if (rightHeight <= leftHeight) {
      rightChildren.push(child)
      rightHeight += child.subtreeHeight + V_GAP
    } else {
      leftChildren.push(child)
      leftHeight += child.subtreeHeight + V_GAP
    }
  }

  rightHeight = Math.max(0, rightHeight - V_GAP)
  leftHeight = Math.max(0, leftHeight - V_GAP)
  const totalHeight = Math.max(measured.height, rightHeight, leftHeight)

  const nodes: LayoutNode[] = []
  const rootLayout = createLayoutNode(
    measured,
    0,
    (totalHeight - measured.height) / 2,
    0,
    null,
    theme.rootFill,
  )
  nodes.push(rootLayout)

  let top = (totalHeight - rightHeight) / 2
  for (const child of rightChildren) {
    const index = measured.children.indexOf(child)
    placeHorizontal(
      child,
      measured.width + H_GAP,
      top,
      1,
      measured.node.id,
      childColor(0, index, theme.rootFill, theme),
      'right',
      theme,
      nodes,
    )
    top += child.subtreeHeight + V_GAP
  }

  top = (totalHeight - leftHeight) / 2
  for (const child of leftChildren) {
    const index = measured.children.indexOf(child)
    placeHorizontal(
      child,
      -H_GAP - child.subtreeWidth,
      top,
      1,
      measured.node.id,
      childColor(0, index, theme.rootFill, theme),
      'left',
      theme,
      nodes,
    )
    top += child.subtreeHeight + V_GAP
  }

  return finishLayout(nodes, doc.structure)
}

export function layoutDocument(
  doc: MindMapDocument,
  theme: MindMapTheme = CLASSIC_THEME,
): LayoutResult {
  switch (doc.structure) {
    case 'logic-left':
      return layoutHorizontal(doc, 'left', theme)
    case 'logic-both':
      return layoutBoth(doc, theme)
    case 'org-down':
      return layoutVertical(doc, theme)
    case 'logic-right':
    case 'mind-map':
    default:
      return layoutHorizontal(doc, 'right', theme)
  }
}
