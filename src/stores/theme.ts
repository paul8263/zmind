import { defineStore } from 'pinia'

import {
  BUILTIN_THEMES,
  loadCustomThemes,
  saveCustomThemes,
  type MindMapTheme,
} from '@/domain/theme'

export const useThemeStore = defineStore('theme', {
  state: () => ({
    customThemes: loadCustomThemes(),
  }),
  getters: {
    allThemes(state): MindMapTheme[] {
      return [...BUILTIN_THEMES, ...state.customThemes]
    },
    byId(state) {
      return (id: string): MindMapTheme =>
        [...BUILTIN_THEMES, ...state.customThemes].find((theme) => theme.id === id) ??
        BUILTIN_THEMES[0]
    },
  },
  actions: {
    addCustom(theme: MindMapTheme) {
      const next = { ...theme, builtin: false }
      const index = this.customThemes.findIndex((item) => item.id === theme.id)

      if (index >= 0) this.customThemes[index] = next
      else this.customThemes.push(next)

      saveCustomThemes(this.customThemes)
    },
    removeCustom(id: string) {
      this.customThemes = this.customThemes.filter((theme) => theme.id !== id)
      saveCustomThemes(this.customThemes)
    },
  },
})
