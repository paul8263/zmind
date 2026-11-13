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

export type MarkerType = 'solid' | 'priority' | 'progress' | 'flag' | 'star' | 'portrait' | 'symbol'

export type MarkerColor = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'gray'

export type MarkerSymbol =
  | 'heart'
  | 'thumb-up'
  | 'thumb-down'
  | 'bolt'
  | 'hourglass'
  | 'check'
  | 'cross'
  | 'question'
  | 'exclamation'

export interface Marker {
  type: MarkerType
  color?: MarkerColor
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

export interface MindMapSheet {
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

export interface MindMapWorkbook {
  schemaVersion: 2
  id: string
  title: string
  sheets: MindMapSheet[]
  activeSheetId: string
  createdAt: string
  updatedAt: string
}
