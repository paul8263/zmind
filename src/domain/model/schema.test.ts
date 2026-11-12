// @vitest-environment node

import { describe, expect, it } from 'vitest'

import {
  createBlankSheet,
  createBlankWorkbook,
  createDemoSheet,
  createWorkbookFromSheet,
} from './document'
import { parseWorkbook, safeParseWorkbook } from './schema'

describe('mind map workbook schema', () => {
  it('parses a blank workbook', () => {
    const workbook = createBlankWorkbook()

    expect(parseWorkbook(workbook)).toEqual(workbook)
  })

  it('parses a workbook with multiple sheets', () => {
    const workbook = createBlankWorkbook()
    const sheet = createDemoSheet()
    workbook.sheets.push(sheet)
    workbook.activeSheetId = sheet.id

    const parsed = parseWorkbook(workbook)

    expect(parsed.sheets).toHaveLength(2)
    expect(parsed.sheets[1].root.children).toHaveLength(3)
    expect(parsed.activeSheetId).toBe(sheet.id)
  })

  it('migrates a version 1 document to a single-sheet workbook', () => {
    const sheet = createDemoSheet()
    const legacy = { schemaVersion: 1, ...sheet }

    const workbook = parseWorkbook(legacy)

    expect(workbook.schemaVersion).toBe(2)
    expect(workbook.title).toBe(sheet.title)
    expect(workbook.sheets).toHaveLength(1)
    expect(workbook.sheets[0]).toEqual(sheet)
    expect(workbook.activeSheetId).toBe(sheet.id)
  })

  it('rejects invalid workbooks', () => {
    expect(safeParseWorkbook({}).success).toBe(false)
    expect(safeParseWorkbook({ schemaVersion: 3 }).success).toBe(false)

    const workbook = createWorkbookFromSheet(createBlankSheet())
    expect(safeParseWorkbook({ ...workbook, sheets: [] }).success).toBe(false)
    expect(() => parseWorkbook({})).toThrow()
  })
})
