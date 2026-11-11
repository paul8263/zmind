import type { NodeShape } from '@/domain/model/types'

export interface NodeBorderMetrics {
  full: number
  bottom: number
  horizontal: number
  vertical: number
}

export function borderMetrics(shape: NodeShape, borderWidth: number): NodeBorderMetrics {
  if (shape === 'rounded' || shape === 'rect' || shape === 'ellipse') {
    return {
      full: borderWidth,
      bottom: 0,
      horizontal: borderWidth * 2,
      vertical: borderWidth * 2,
    }
  }

  if (shape === 'underline') {
    const bottom = Math.max(borderWidth, 2)
    return { full: 0, bottom, horizontal: 0, vertical: bottom }
  }

  return { full: 0, bottom: 0, horizontal: 0, vertical: 0 }
}
