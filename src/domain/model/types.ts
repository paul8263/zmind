export type Structure = 'logic-right' | 'logic-left' | 'logic-both' | 'org-down' | 'mind-map'

export type LineStyle = 'solid' | 'dashed' | 'dotted'

export type NodeShape = 'rounded' | 'rect' | 'ellipse' | 'underline' | 'none'

export interface NodeStyle {
  fill?: string
  borderColor?: string
  borderWidth?: number
  borderRadius?: number
  fontFamily?: string
  fontSize?: number
  fontWeight?: 'normal' | 'bold'
  fontStyle?: 'normal' | 'italic'
  textColor?: string
  textAlign?: 'left' | 'center' | 'right'
  lineColor?: string
  lineWidth?: number
  lineStyle?: LineStyle
  shape?: NodeShape
}

export interface Marker {
  type: string
  value?: string
}

export interface ImageRef {
  src: string
  width?: number
  height?: number
}

export interface TopicNode {
  id: string
  title: string
  children: TopicNode[]
  collapsed: boolean
  style?: NodeStyle
  notes?: string
  markers?: Marker[]
  hyperlink?: string
  image?: ImageRef
  layout?: {
    width?: number
    offsetX?: number
    offsetY?: number
  }
  meta?: Record<string, unknown>
}

export interface Relationship {
  id: string
  fromId: string
  toId: string
  label?: string
  style?: {
    color?: string
    width?: number
    dashed?: boolean
  }
}

export interface Boundary {
  id: string
  nodeId: string
  label?: string
  color?: string
}

export interface Summary {
  id: string
  nodeId: string
  title: string
}

export interface MindMapDocument {
  schemaVersion: 1
  id: string
  title: string
  root: TopicNode
  themeId: string
  structure: Structure
  relationships: Relationship[]
  boundaries: Boundary[]
  summaries: Summary[]
  createdAt: string
  updatedAt: string
}
