const openOverlays = new Set<symbol>()

export function openTransientOverlay(): symbol {
  const token = Symbol('transient-overlay')
  openOverlays.add(token)
  return token
}

export function closeTransientOverlay(token: symbol | null) {
  if (token) openOverlays.delete(token)
}

export function hasOpenTransientOverlay(): boolean {
  return openOverlays.size > 0
}
