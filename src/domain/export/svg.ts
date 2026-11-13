import { layoutDocument } from '@/domain/layout/logical'
import { borderMetrics } from '@/domain/layout/border'
import { measureNodeSize } from '@/domain/layout/measure'
import { FONT_FAMILY, resolveNodeStyle } from '@/domain/layout/style'
import { MARKER_BLOCK_GAP, MARKER_SIZE, markerRowWidth } from '@/domain/markers/layout'
import { renderMarkerSvg } from '@/domain/markers/render'
import type { MindMapSheet } from '@/domain/model/types'
import type { MindMapTheme } from '@/domain/theme'

export interface SvgExportOptions {
  padding?: number
  untitledTitle?: string
}

export interface RenderedSvg {
  svg: string
  width: number
  height: number
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function number(value: number): string {
  return String(Math.round(value * 100) / 100)
}

export function renderDocumentSvg(
  doc: MindMapSheet,
  theme: MindMapTheme,
  options: SvgExportOptions = {},
): RenderedSvg {
  const padding = options.padding ?? 48
  const untitledTitle = options.untitledTitle ?? 'Untitled'
  const layout = layoutDocument(doc, theme)
  const width = Math.max(1, Math.ceil(layout.bounds.width + padding * 2))
  const height = Math.max(1, Math.ceil(layout.bounds.height + padding * 2))

  const connections = layout.connections
    .map((connection) => {
      const dash = connection.dasharray
        ? ` stroke-dasharray="${escapeXml(connection.dasharray)}"`
        : ''
      return `<path d="${escapeXml(connection.path)}" fill="none" stroke="${escapeXml(connection.color)}" stroke-width="${number(connection.width)}"${dash} stroke-linecap="round"/>`
    })
    .join('')

  const nodes = layout.nodes
    .map((node) => {
      const style = resolveNodeStyle(node.depth, node.branchColor, node.node.style, theme)
      const borders = borderMetrics(style.shape, style.borderWidth)
      const title = node.node.title || untitledTitle
      const lines = measureNodeSize(title, node.depth, node.node.style, node.node.markers).lines
      const lineHeight = Math.round(style.fontSize * style.lineHeight)
      const contentX = node.x + borders.full + style.paddingX
      const contentWidth = node.width - style.paddingX * 2 - borders.horizontal
      const textHeight = lines.length * lineHeight
      const markerLayout = node.markerLayout
      const contentHeight = textHeight + (markerLayout ? MARKER_BLOCK_GAP + markerLayout.height : 0)
      const contentBoxHeight = node.height - borders.full * 2 - borders.bottom
      const contentTop = node.y + borders.full + (contentBoxHeight - contentHeight) / 2
      const startY = contentTop + lineHeight / 2
      const markerTop = contentTop + textHeight + (markerLayout ? MARKER_BLOCK_GAP : 0)
      const hasBorder =
        style.borderWidth > 0 &&
        (style.shape === 'rounded' || style.shape === 'rect' || style.shape === 'ellipse')
      const stroke = hasBorder
        ? ` stroke="${escapeXml(style.borderColor)}" stroke-width="${number(style.borderWidth)}"`
        : ''
      const fill = style.fill === 'transparent' ? 'none' : escapeXml(style.fill)
      let shape = ''

      if (style.shape === 'rounded' || style.shape === 'rect') {
        const radius =
          style.shape === 'rounded' && typeof style.borderRadius === 'number'
            ? style.borderRadius
            : 0
        shape = `<rect x="${number(node.x)}" y="${number(node.y)}" width="${number(node.width)}" height="${number(node.height)}" rx="${number(radius)}" fill="${fill}"${stroke}/>`
      } else if (style.shape === 'ellipse') {
        shape = `<ellipse cx="${number(node.x + node.width / 2)}" cy="${number(node.y + node.height / 2)}" rx="${number(node.width / 2)}" ry="${number(node.height / 2)}" fill="${fill}"${stroke}/>`
      } else if (style.shape === 'underline') {
        shape = `<line x1="${number(node.x)}" y1="${number(node.y + node.height)}" x2="${number(node.x + node.width)}" y2="${number(node.y + node.height)}" stroke="${escapeXml(style.borderColor)}" stroke-width="${number(Math.max(style.borderWidth, 2))}" stroke-linecap="round"/>`
      }

      const anchor =
        style.textAlign === 'left' ? 'start' : style.textAlign === 'right' ? 'end' : 'middle'
      const textX =
        style.textAlign === 'left'
          ? contentX
          : style.textAlign === 'right'
            ? contentX + contentWidth
            : node.x + node.width / 2

      const text = lines
        .map((line, index) => {
          const value = line ? escapeXml(line) : '&#160;'
          return `<text x="${number(textX)}" y="${number(startY + index * lineHeight)}" text-anchor="${anchor}" dominant-baseline="central" font-family="${escapeXml(FONT_FAMILY)}" font-size="${number(style.fontSize)}" font-weight="${style.fontWeight}" font-style="${style.fontStyle}" fill="${escapeXml(style.textColor)}" xml:space="preserve">${value}</text>`
        })
        .join('')

      const markers = markerLayout
        ? markerLayout.rows
            .map((row) => {
              const offsetX = contentX + Math.max(0, (contentWidth - markerRowWidth(row)) / 2)
              return row
                .map((item) =>
                  renderMarkerSvg(item.marker, offsetX + item.x, markerTop + item.y, MARKER_SIZE),
                )
                .join('')
            })
            .join('')
        : ''

      return `<g data-node-id="${escapeXml(node.id)}">${shape}${text}${markers}</g>`
    })
    .join('')

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img"><rect width="100%" height="100%" fill="${escapeXml(theme.canvasBg)}"/><g transform="translate(${number(padding - layout.bounds.x)} ${number(padding - layout.bounds.y)})">${connections}${nodes}</g></svg>`

  return { svg, width, height }
}
