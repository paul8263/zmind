import { z } from 'zod'

import { createId } from './document'
import type { MindMapSheet, MindMapWorkbook, TopicNode } from './types'

const lineStyleSchema = z.enum(['solid', 'dashed', 'dotted'])
const nodeShapeSchema = z.enum(['rounded', 'rect', 'ellipse', 'underline', 'none'])

export const nodeStyleSchema = z.object({
  fill: z.string().optional(),
  borderColor: z.string().optional(),
  borderWidth: z.number().optional(),
  borderRadius: z.number().optional(),
  fontFamily: z.string().optional(),
  fontSize: z.number().optional(),
  fontWeight: z.enum(['normal', 'bold']).optional(),
  fontStyle: z.enum(['normal', 'italic']).optional(),
  textColor: z.string().optional(),
  textAlign: z.enum(['left', 'center', 'right']).optional(),
  lineColor: z.string().optional(),
  lineWidth: z.number().optional(),
  lineStyle: lineStyleSchema.optional(),
  shape: nodeShapeSchema.optional(),
})

const markerTypeSchema = z.enum([
  'solid',
  'priority',
  'progress',
  'flag',
  'star',
  'portrait',
  'symbol',
])

const markerColorSchema = z.enum(['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'gray'])

const markerSchema = z.object({
  type: markerTypeSchema,
  color: markerColorSchema.optional(),
  value: z.string().optional(),
})

const imageRefSchema = z.object({
  src: z.string(),
  width: z.number().optional(),
  height: z.number().optional(),
})

export const topicNodeSchema: z.ZodType<TopicNode> = z.lazy(() =>
  z.object({
    id: z.string(),
    title: z.string(),
    children: z.array(topicNodeSchema),
    collapsed: z.boolean(),
    style: nodeStyleSchema.optional(),
    notes: z.string().optional(),
    markers: z.array(markerSchema).optional(),
    hyperlink: z.string().optional(),
    image: imageRefSchema.optional(),
    layout: z
      .object({
        width: z.number().optional(),
        offsetX: z.number().optional(),
        offsetY: z.number().optional(),
      })
      .optional(),
    meta: z.record(z.string(), z.unknown()).optional(),
  }),
)

const relationshipSchema = z.object({
  id: z.string(),
  fromId: z.string(),
  toId: z.string(),
  label: z.string().optional(),
  style: z
    .object({
      color: z.string().optional(),
      width: z.number().optional(),
      dashed: z.boolean().optional(),
    })
    .optional(),
})

const boundarySchema = z.object({
  id: z.string(),
  nodeId: z.string(),
  label: z.string().optional(),
  color: z.string().optional(),
})

const summarySchema = z.object({
  id: z.string(),
  nodeId: z.string(),
  title: z.string(),
})

const sheetShape = {
  id: z.string(),
  title: z.string(),
  root: topicNodeSchema,
  themeId: z.string(),
  structure: z.enum(['logic-right', 'logic-left', 'logic-both', 'org-down', 'mind-map']),
  relationships: z.array(relationshipSchema),
  boundaries: z.array(boundarySchema),
  summaries: z.array(summarySchema),
  createdAt: z.string(),
  updatedAt: z.string(),
}

export const mindMapSheetSchema: z.ZodType<MindMapSheet> = z.object(sheetShape)

const legacyDocumentSchema = z.object({
  schemaVersion: z.literal(1),
  ...sheetShape,
})

export const mindMapWorkbookSchema: z.ZodType<MindMapWorkbook> = z.object({
  schemaVersion: z.literal(2),
  id: z.string(),
  title: z.string(),
  sheets: z.array(mindMapSheetSchema).min(1),
  activeSheetId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function migrateLegacyDocument(input: unknown): MindMapWorkbook {
  const legacy = legacyDocumentSchema.parse(input)
  const sheet: MindMapSheet = {
    id: legacy.id,
    title: legacy.title,
    root: legacy.root,
    themeId: legacy.themeId,
    structure: legacy.structure,
    relationships: legacy.relationships,
    boundaries: legacy.boundaries,
    summaries: legacy.summaries,
    createdAt: legacy.createdAt,
    updatedAt: legacy.updatedAt,
  }

  return {
    schemaVersion: 2,
    id: createId('workbook'),
    title: sheet.title,
    sheets: [sheet],
    activeSheetId: sheet.id,
    createdAt: sheet.createdAt,
    updatedAt: sheet.updatedAt,
  }
}

export function parseWorkbook(input: unknown): MindMapWorkbook {
  if (isRecord(input) && input.schemaVersion === 1) {
    return migrateLegacyDocument(input)
  }

  return mindMapWorkbookSchema.parse(input)
}

export type WorkbookParseResult =
  { success: true; data: MindMapWorkbook } | { success: false; error: unknown }

export function safeParseWorkbook(input: unknown): WorkbookParseResult {
  try {
    return { success: true, data: parseWorkbook(input) }
  } catch (error) {
    return { success: false, error }
  }
}
