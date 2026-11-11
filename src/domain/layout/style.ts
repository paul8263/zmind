import type { NodeShape, NodeStyle } from '@/domain/model/types'
import type { MindMapTheme } from '@/domain/theme'

export const FONT_FAMILY =
  '"Segoe UI", "Microsoft YaHei UI", "Microsoft YaHei", system-ui, -apple-system, sans-serif'

export interface NodeVisualStyle {
  fontSize: number
  fontWeight: number
  paddingX: number
  paddingY: number
  minWidth: number
  maxWidth: number
  borderRadius: number
}

export interface ResolvedNodeStyle {
  fontSize: number
  fontWeight: number
  fontStyle: 'normal' | 'italic'
  fontFamily: string
  textAlign: 'left' | 'center' | 'right'
  fill: string
  textColor: string
  borderColor: string
  borderWidth: number
  borderRadius: number | string
  shape: NodeShape
  paddingX: number
  paddingY: number
  lineHeight: number
}

export function getNodeVisualStyle(depth: number): NodeVisualStyle {
  if (depth === 0) {
    return {
      fontSize: 16,
      fontWeight: 600,
      paddingX: 18,
      paddingY: 12,
      minWidth: 120,
      maxWidth: 300,
      borderRadius: 10,
    }
  }

  if (depth === 1) {
    return {
      fontSize: 14,
      fontWeight: 600,
      paddingX: 14,
      paddingY: 10,
      minWidth: 96,
      maxWidth: 260,
      borderRadius: 8,
    }
  }

  return {
    fontSize: 13,
    fontWeight: 400,
    paddingX: 12,
    paddingY: 8,
    minWidth: 72,
    maxWidth: 240,
    borderRadius: 6,
  }
}

export function getEffectiveFont(depth: number, nodeStyle?: NodeStyle) {
  const visual = getNodeVisualStyle(depth)
  const fontSize = nodeStyle?.fontSize ?? visual.fontSize
  const fontWeight =
    nodeStyle?.fontWeight === 'bold'
      ? 700
      : nodeStyle?.fontWeight === 'normal'
        ? 400
        : visual.fontWeight
  const fontStyle = nodeStyle?.fontStyle === 'italic' ? 'italic ' : ''
  const fontFamily = nodeStyle?.fontFamily ?? FONT_FAMILY

  return {
    fontSize,
    fontWeight,
    fontFamily,
    fontStyle: nodeStyle?.fontStyle ?? ('normal' as const),
    font: `${fontStyle}${fontWeight} ${fontSize}px ${fontFamily}`,
    visual,
  }
}

export function resolveNodeStyle(
  depth: number,
  branchColor: string,
  nodeStyle: NodeStyle | undefined,
  theme: MindMapTheme,
): ResolvedNodeStyle {
  const { fontSize, fontWeight, fontFamily, fontStyle, visual } = getEffectiveFont(depth, nodeStyle)
  const shape = nodeStyle?.shape ?? 'rounded'
  const themeFill = depth === 0 ? theme.rootFill : depth === 1 ? branchColor : theme.nodeFill
  const themeText = depth === 0 ? theme.rootText : depth === 1 ? theme.branchText : theme.nodeText
  const fill =
    nodeStyle?.fill ?? (shape === 'none' || shape === 'underline' ? 'transparent' : themeFill)
  const borderRadius =
    shape === 'ellipse'
      ? '50%'
      : shape === 'rounded'
        ? (nodeStyle?.borderRadius ?? visual.borderRadius)
        : 0

  return {
    fontSize,
    fontWeight,
    fontStyle,
    fontFamily,
    textAlign: nodeStyle?.textAlign ?? 'center',
    fill,
    textColor: nodeStyle?.textColor ?? themeText,
    borderColor: nodeStyle?.borderColor ?? branchColor,
    borderWidth: nodeStyle?.borderWidth ?? (depth <= 1 ? 0 : 1.5),
    borderRadius,
    shape,
    paddingX: visual.paddingX,
    paddingY: visual.paddingY,
    lineHeight: 1.45,
  }
}
