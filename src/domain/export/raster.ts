import type { RenderedSvg } from './svg'

const MAX_RASTER_DIMENSION = 16384

export class ExportTooLargeError extends Error {
  constructor() {
    super('The requested image is too large')
    this.name = 'ExportTooLargeError'
  }
}

export async function svgToPngBlob(rendered: RenderedSvg, scale: number): Promise<Blob> {
  const width = Math.ceil(rendered.width * scale)
  const height = Math.ceil(rendered.height * scale)
  if (width > MAX_RASTER_DIMENSION || height > MAX_RASTER_DIMENSION) {
    throw new ExportTooLargeError()
  }

  if (typeof document === 'undefined') {
    throw new Error('PNG export requires a browser environment')
  }

  if (document.fonts?.ready) await document.fonts.ready

  const svgBlob = new Blob([rendered.svg], {
    type: 'image/svg+xml;charset=utf-8',
  })
  const url = URL.createObjectURL(svgBlob)
  const image = new Image()

  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('Could not rasterize the SVG'))
      image.src = url
    })

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Could not create a canvas context')

    context.setTransform(scale, 0, 0, scale, 0, 0)
    context.drawImage(image, 0, 0, rendered.width, rendered.height)

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((value) => resolve(value), 'image/png')
    })
    if (!blob) throw new Error('Could not encode the PNG image')
    return blob
  } finally {
    URL.revokeObjectURL(url)
  }
}
