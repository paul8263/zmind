// @vitest-environment node

import { describe, expect, it } from 'vitest'

import { parseMarkdown } from './markdown'

describe('Markdown import', () => {
  it('parses headings and nested bullets', () => {
    const doc = parseMarkdown(
      ['# Root', '', '## Branch', '- Leaf', '  - Deep', '## Second', '- Item'].join('\n'),
    )

    expect(doc.title).toBe('Root')
    expect(doc.root.title).toBe('Root')
    expect(doc.root.children.map((node) => node.title)).toEqual(['Branch', 'Second'])
    expect(doc.root.children[0].children[0].title).toBe('Leaf')
    expect(doc.root.children[0].children[0].children[0].title).toBe('Deep')
    expect(doc.root.children[1].children[0].title).toBe('Item')
  })

  it('uses the first bullet as the root when there are no headings', () => {
    const doc = parseMarkdown('- Root\n  - Child\n- Sibling')

    expect(doc.root.title).toBe('Root')
    expect(doc.root.children.map((node) => node.title)).toEqual(['Child', 'Sibling'])
  })

  it('restores line breaks and strips simple inline formatting', () => {
    const doc = parseMarkdown('# **Root**\n- a<br>b\n- `code`')

    expect(doc.root.title).toBe('Root')
    expect(doc.root.children[0].title).toBe('a\nb')
    expect(doc.root.children[1].title).toBe('code')
  })

  it('rejects empty input', () => {
    expect(() => parseMarkdown('\n\n')).toThrow()
  })
})
