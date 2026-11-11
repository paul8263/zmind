import { defineStore } from 'pinia'

export const MIN_SCALE = 0.2
export const MAX_SCALE = 3

export const useViewportStore = defineStore('viewport', {
  state: () => ({
    x: 0,
    y: 0,
    scale: 1,
  }),
  actions: {
    set(x: number, y: number, scale: number) {
      this.x = x
      this.y = y
      this.scale = scale
    },
    panBy(dx: number, dy: number) {
      this.x += dx
      this.y += dy
    },
    zoomAt(px: number, py: number, factor: number) {
      const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, this.scale * factor))
      if (nextScale === this.scale) return

      const worldX = (px - this.x) / this.scale
      const worldY = (py - this.y) / this.scale

      this.scale = nextScale
      this.x = px - worldX * nextScale
      this.y = py - worldY * nextScale
    },
    reset() {
      this.x = 0
      this.y = 0
      this.scale = 1
    },
  },
})
