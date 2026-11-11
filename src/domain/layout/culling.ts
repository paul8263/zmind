import type { LayoutResult, Rect } from './logical'

export function rectsIntersect(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
}

export function cullLayout(layout: LayoutResult, viewport: Rect, margin = 0): LayoutResult {
  if (viewport.width <= 0 || viewport.height <= 0) return layout

  const expanded = {
    x: viewport.x - margin,
    y: viewport.y - margin,
    width: viewport.width + margin * 2,
    height: viewport.height + margin * 2,
  }
  const nodes = layout.nodes.filter((node) => rectsIntersect(node, expanded))
  const visibleIds = new Set(nodes.map((node) => node.id))
  const connections = layout.connections.filter(
    (connection) =>
      visibleIds.has(connection.parentId) ||
      visibleIds.has(connection.childId) ||
      rectsIntersect(connection.bounds, expanded),
  )

  return { ...layout, nodes, connections }
}
