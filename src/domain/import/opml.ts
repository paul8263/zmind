import { createBlankSheet, createTopic } from '@/domain/model/document'
import type { MindMapSheet, TopicNode } from '@/domain/model/types'

function childOutlines(element: Element): Element[] {
  return Array.from(element.children).filter((child) => child.localName.toLowerCase() === 'outline')
}

function outlineTitle(element: Element): string {
  return (element.getAttribute('text') ?? element.getAttribute('title') ?? '').trim()
}

function mapOutline(element: Element, fallbackTitle: string): TopicNode {
  const node = createTopic(outlineTitle(element) || fallbackTitle)
  node.children = childOutlines(element).map((child) => mapOutline(child, fallbackTitle))
  return node
}

export function parseOpml(text: string, fallbackTitle = 'Untitled'): MindMapSheet {
  const xml = new DOMParser().parseFromString(text, 'application/xml')
  if (xml.querySelector('parsererror')) {
    throw new Error('The OPML document is not valid XML')
  }
  if (xml.documentElement.localName.toLowerCase() !== 'opml') {
    throw new Error('The document is not an OPML file')
  }

  const body = xml.querySelector('body')
  if (!body) throw new Error('The OPML document has no body')

  const topLevel = childOutlines(body)
  if (topLevel.length === 0) throw new Error('The OPML document has no outlines')

  let root: TopicNode
  if (topLevel.length === 1) {
    root = mapOutline(topLevel[0], fallbackTitle)
  } else {
    root = createTopic(fallbackTitle)
    root.children = topLevel.map((element) => mapOutline(element, fallbackTitle))
  }

  root.title = root.title || fallbackTitle
  const doc = createBlankSheet(root.title, root.title)
  doc.root = root
  doc.title = root.title
  return doc
}
