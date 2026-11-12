import { createBlankSheet, createTopic } from '@/domain/model/document'
import type { MindMapSheet, TopicNode } from '@/domain/model/types'

interface HeadingToken {
  kind: 'heading'
  level: number
  text: string
}

interface BulletToken {
  kind: 'bullet'
  indent: number
  text: string
}

type MarkdownToken = HeadingToken | BulletToken

function cleanText(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/`([^`]*)`/g, '$1')
    .trim()
}

function tokenize(markdown: string): MarkdownToken[] {
  const tokens: MarkdownToken[] = []
  let inFence = false

  for (const rawLine of markdown.split(/\r?\n/)) {
    if (/^\s*```/.test(rawLine)) {
      inFence = !inFence
      continue
    }
    if (inFence) continue

    const heading = rawLine.match(/^(#{1,6})\s+(.*)$/)
    if (heading) {
      const text = cleanText(heading[2])
      if (text) tokens.push({ kind: 'heading', level: heading[1].length, text })
      continue
    }

    const bullet = rawLine.match(/^(\s*)(?:[-*+]|\d+[.)])\s+(.*)$/)
    if (bullet) {
      const text = cleanText(bullet[2])
      if (text) {
        const indent = bullet[1].replace(/\t/g, '  ').length
        tokens.push({ kind: 'bullet', indent, text })
      }
    }
  }

  return tokens
}

function buildRoot(tokens: MarkdownToken[], fallbackTitle: string): TopicNode {
  let root: TopicNode | null = null
  let currentHeading: TopicNode | null = null
  const headingStack: { level: number; node: TopicNode }[] = []
  const bulletStack: { indent: number; node: TopicNode }[] = []

  for (const token of tokens) {
    if (token.kind === 'heading') {
      const node = createTopic(token.text)

      if (!root) {
        root = node
      } else {
        while (
          headingStack.length > 0 &&
          headingStack[headingStack.length - 1].level >= token.level
        ) {
          headingStack.pop()
        }
        const parent = headingStack[headingStack.length - 1]?.node ?? root
        parent.children.push(node)
      }

      headingStack.push({ level: token.level, node })
      currentHeading = node
      bulletStack.length = 0
      continue
    }

    if (!root) {
      root = createTopic(token.text)
      currentHeading = root
      headingStack.push({ level: 1, node: root })
      continue
    }

    while (bulletStack.length > 0 && bulletStack[bulletStack.length - 1].indent >= token.indent) {
      bulletStack.pop()
    }
    const parent = bulletStack[bulletStack.length - 1]?.node ?? currentHeading ?? root
    const node = createTopic(token.text)
    parent.children.push(node)
    bulletStack.push({ indent: token.indent, node })
  }

  if (!root) throw new Error('No Markdown headings or list items were found')
  root.title = root.title || fallbackTitle
  return root
}

export function parseMarkdown(markdown: string, fallbackTitle = 'Untitled'): MindMapSheet {
  const tokens = tokenize(markdown)
  const root = buildRoot(tokens, fallbackTitle)
  const doc = createBlankSheet(root.title, root.title)
  doc.root = root
  doc.title = root.title
  return doc
}
