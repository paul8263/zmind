// @vitest-environment node

import { describe, expect, it } from 'vitest'

import { createBlankDocument, createDemoDocument } from './document'
import { parseDocument, safeParseDocument } from './schema'

describe('mind map document schema', () => {
  it('parses a blank document', () => {
    const doc = createBlankDocument()

    expect(parseDocument(doc)).toEqual(doc)
  })

  it('parses the demo document', () => {
    const doc = createDemoDocument()
    const parsed = parseDocument(doc)

    expect(parsed.root.children).toHaveLength(3)
    expect(parsed.title).toBe('Zmind 示例')
  })

  it('rejects invalid documents', () => {
    expect(safeParseDocument({ schemaVersion: 2 }).success).toBe(false)
    expect(() => parseDocument({})).toThrow()
  })
})
