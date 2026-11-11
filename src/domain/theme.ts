export type ThemeMode = 'light' | 'dark'

export interface ThemeName {
  zh: string
  en: string
}

export interface MindMapTheme {
  id: string
  name: ThemeName
  mode: ThemeMode
  canvasBg: string
  rootFill: string
  rootText: string
  branchText: string
  nodeFill: string
  nodeText: string
  branchPalette: string[]
  builtin: boolean
}

export const DEFAULT_THEME_ID = 'classic'
export const CUSTOM_THEME_STORAGE_KEY = 'zmind.customThemes'

export const CLASSIC_THEME: MindMapTheme = {
  id: 'classic',
  name: { zh: '经典', en: 'Classic' },
  mode: 'light',
  canvasBg: '#f7f8fa',
  rootFill: '#1f2937',
  rootText: '#ffffff',
  branchText: '#ffffff',
  nodeFill: '#ffffff',
  nodeText: '#1f2937',
  branchPalette: ['#e8590c', '#1c7ed6', '#0ca678', '#ae3ec9', '#f59f00', '#e03131'],
  builtin: true,
}

export const BUILTIN_THEMES: MindMapTheme[] = [
  CLASSIC_THEME,
  {
    id: 'fresh',
    name: { zh: '清新', en: 'Fresh' },
    mode: 'light',
    canvasBg: '#f3f9ff',
    rootFill: '#0f766e',
    rootText: '#ffffff',
    branchText: '#ffffff',
    nodeFill: '#ffffff',
    nodeText: '#134e4a',
    branchPalette: ['#0d9488', '#0284c7', '#65a30d', '#7c3aed', '#f59e0b', '#e11d48'],
    builtin: true,
  },
  {
    id: 'warm',
    name: { zh: '暖阳', en: 'Warm' },
    mode: 'light',
    canvasBg: '#fff7ed',
    rootFill: '#9a3412',
    rootText: '#ffffff',
    branchText: '#ffffff',
    nodeFill: '#fffbeb',
    nodeText: '#431407',
    branchPalette: ['#ea580c', '#d97706', '#ca8a04', '#dc2626', '#db2777', '#9333ea'],
    builtin: true,
  },
  {
    id: 'ocean',
    name: { zh: '深海', en: 'Ocean' },
    mode: 'dark',
    canvasBg: '#0b1220',
    rootFill: '#0ea5e9',
    rootText: '#f8fafc',
    branchText: '#0b1220',
    nodeFill: '#1e293b',
    nodeText: '#e2e8f0',
    branchPalette: ['#38bdf8', '#22d3ee', '#34d399', '#a78bfa', '#fbbf24', '#fb7185'],
    builtin: true,
  },
  {
    id: 'forest',
    name: { zh: '森林', en: 'Forest' },
    mode: 'light',
    canvasBg: '#f2f7f2',
    rootFill: '#14532d',
    rootText: '#ffffff',
    branchText: '#ffffff',
    nodeFill: '#ffffff',
    nodeText: '#14532d',
    branchPalette: ['#15803d', '#0f766e', '#4d7c0f', '#a16207', '#b45309', '#166534'],
    builtin: true,
  },
  {
    id: 'mono',
    name: { zh: '极简', en: 'Mono' },
    mode: 'light',
    canvasBg: '#fafafa',
    rootFill: '#111827',
    rootText: '#ffffff',
    branchText: '#ffffff',
    nodeFill: '#ffffff',
    nodeText: '#111827',
    branchPalette: ['#374151', '#4b5563', '#6b7280', '#52525b', '#71717a', '#3f3f46'],
    builtin: true,
  },
]

export function resolveTheme(
  themeId: string | undefined,
  customThemes: MindMapTheme[] = [],
): MindMapTheme {
  const all = [...BUILTIN_THEMES, ...customThemes]
  return all.find((theme) => theme.id === themeId) ?? CLASSIC_THEME
}

function isTheme(value: unknown): value is MindMapTheme {
  if (!value || typeof value !== 'object') return false

  const theme = value as Partial<MindMapTheme>
  return (
    typeof theme.id === 'string' &&
    typeof theme.canvasBg === 'string' &&
    typeof theme.rootFill === 'string' &&
    typeof theme.rootText === 'string' &&
    typeof theme.branchText === 'string' &&
    typeof theme.nodeFill === 'string' &&
    typeof theme.nodeText === 'string' &&
    Array.isArray(theme.branchPalette) &&
    theme.branchPalette.length > 0 &&
    theme.branchPalette.every((color) => typeof color === 'string') &&
    Boolean(theme.name) &&
    typeof theme.name?.zh === 'string' &&
    typeof theme.name?.en === 'string' &&
    (theme.mode === 'light' || theme.mode === 'dark')
  )
}

export function loadCustomThemes(): MindMapTheme[] {
  if (typeof localStorage === 'undefined') return []

  try {
    const raw = localStorage.getItem(CUSTOM_THEME_STORAGE_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return parsed.filter(isTheme).map((theme) => ({ ...theme, builtin: false }))
  } catch {
    return []
  }
}

export function saveCustomThemes(themes: MindMapTheme[]) {
  if (typeof localStorage === 'undefined') return

  try {
    localStorage.setItem(CUSTOM_THEME_STORAGE_KEY, JSON.stringify(themes))
  } catch {
    // Custom themes remain available for the current session if storage is unavailable.
  }
}

export function createCustomThemeId(): string {
  return `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}
