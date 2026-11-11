// @vitest-environment node

import { describe, expect, it } from 'vitest'

import { createBlankDocument, createTopic } from '@/domain/model/document'
import { resolveTheme } from '@/domain/theme'

import { documentToMarkdown } from './markdown'
import { renderDocumentSvg } from './svg'

function makeDocument() {
  const doc = createBlankDocument('Export demo')
  doc.root.title = 'Root & <Center>'
  const child = createTopic('Child\nwith two lines')
  child.style = { shape: 'ellipse', lineStyle: 'dashed', lineWidth: 4 }
  child.children.push(createTopic('Grandchild'))
  doc.root.children.push(child)
  return doc
}

describe('SVG export', () => {
  it('renders connections, nodes and escaped text', () => {
    const doc = makeDocument()
    const rendered = renderDocumentSvg(doc, resolveTheme('classic'), {
      padding: 24,
      untitledTitle: 'Untitled',
    })

    expect(rendered.width).toBeGreaterThan(48)
    expect(rendered.height).toBeGreaterThan(48)
    expect(rendered.svg).toContain('<svg')
    expect(rendered.svg).toContain('viewBox=')
    expect(rendered.svg).toContain('<path')
    expect(rendered.svg).toContain('stroke-dasharray="7 5"')
    expect(rendered.svg).toContain('stroke-width="4"')
    expect(rendered.svg).toContain('<ellipse')
    expect(rendered.svg).toContain('Root &amp; &lt;Center&gt;')
    expect(rendered.svg).toContain('Child')
    expect(rendered.svg).toContain('Grandchild')
  })

  it('uses the theme background and node colors', () => {
    const doc = makeDocument()
    const theme = resolveTheme('ocean')
    const rendered = renderDocumentSvg(doc, theme)

    expect(rendered.svg).toContain(theme.canvasBg)
    expect(rendered.svg).toContain(theme.rootFill)
    expect(rendered.svg).toContain(theme.rootText)
  })
})

describe('Markdown export', () => {
  it('exports a heading root and nested bullet list', () => {
    const markdown = documentToMarkdown(makeDocument())

    expect(markdown).toContain('# Root & <Center>')
    expect(markdown).toContain('- Child<br>with two lines')
    expect(markdown).toContain('  - Grandchild')
    expect(markdown.endsWith('\n')).toBe(true)
  })
})
