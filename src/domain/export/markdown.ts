import type { Marker, MindMapSheet, TopicNode } from '@/domain/model/types'

function escapeMarkdownTitle(title: string, fallback: string): string {
  const value = title.trim() || fallback
  return value.replace(/\r?\n/g, '<br>')
}

export function documentToMarkdown(
  doc: MindMapSheet,
  fallbackTitle = 'Untitled',
  markerText?: (marker: Marker) => string,
): string {
  const lines = [`# ${escapeMarkdownTitle(doc.root.title, fallbackTitle)}`]

  const walk = (nodes: TopicNode[], depth: number) => {
    for (const node of nodes) {
      const markers =
        markerText && node.markers?.length
          ? `  ${node.markers.map((marker) => `[${markerText(marker)}]`).join(' ')}`
          : ''
      lines.push(
        `${'  '.repeat(depth)}- ${escapeMarkdownTitle(node.title, fallbackTitle)}${markers}`,
      )
      walk(node.children, depth + 1)
    }
  }

  walk(doc.root.children, 0)
  return `${lines.join('\n')}\n`
}
