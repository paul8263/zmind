// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'

import { parseOpml } from './opml'

const OPML = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head><title>Example</title></head>
  <body>
    <outline text="Root" _note="ignored">
      <outline text="Branch">
        <outline title="Leaf"/>
      </outline>
      <outline text="Second"/>
    </outline>
  </body>
</opml>`

describe('OPML import', () => {
  it('maps nested outlines into topics', () => {
    const doc = parseOpml(OPML)

    expect(doc.title).toBe('Root')
    expect(doc.root.title).toBe('Root')
    expect(doc.root.children.map((node) => node.title)).toEqual(['Branch', 'Second'])
    expect(doc.root.children[0].children[0].title).toBe('Leaf')
  })

  it('creates a synthetic root for multiple top-level outlines', () => {
    const doc = parseOpml(
      '<opml><body><outline text="One"/><outline text="Two"/></body></opml>',
      'Imported',
    )

    expect(doc.root.title).toBe('Imported')
    expect(doc.root.children.map((node) => node.title)).toEqual(['One', 'Two'])
  })

  it('rejects invalid OPML', () => {
    expect(() => parseOpml('<opml><body></body></opml>')).toThrow()
    expect(() => parseOpml('<not-opml/>')).toThrow()
  })
})
