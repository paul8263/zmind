import { z } from 'zod'

import type { MindMapDocument, TopicNode } from './types'

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

const markerSchema = z.object({
  type: z.string(),
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

export const mindMapDocumentSchema: z.ZodType<MindMapDocument> = z.object({
  schemaVersion: z.literal(1),
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
})

export function parseDocument(input: unknown): MindMapDocument {
  return mindMapDocumentSchema.parse(input)
}

export function safeParseDocument(input: unknown) {
  return mindMapDocumentSchema.safeParse(input)
}
