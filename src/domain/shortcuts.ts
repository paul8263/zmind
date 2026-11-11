import type { MessageKey } from '@/i18n/messages'

export interface ShortcutItem {
  keys: string
  descriptionKey: MessageKey
}

export interface ShortcutGroup {
  titleKey: MessageKey
  items: ShortcutItem[]
}

export const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    titleKey: 'shortcuts.file',
    items: [
      { keys: 'Ctrl + N', descriptionKey: 'shortcuts.newDocument' },
      { keys: 'Ctrl + O', descriptionKey: 'shortcuts.openDocument' },
      { keys: 'Ctrl + S', descriptionKey: 'shortcuts.saveDocument' },
      { keys: 'Ctrl + Shift + S', descriptionKey: 'shortcuts.saveAsDocument' },
    ],
  },
  {
    titleKey: 'shortcuts.nodes',
    items: [
      { keys: 'Tab', descriptionKey: 'shortcuts.newChild' },
      { keys: 'Enter', descriptionKey: 'shortcuts.newSibling' },
      { keys: 'F2 / Double-click', descriptionKey: 'shortcuts.edit' },
      { keys: 'Delete / Backspace', descriptionKey: 'shortcuts.delete' },
      { keys: 'Space', descriptionKey: 'shortcuts.collapse' },
      { keys: 'Alt + Arrow keys', descriptionKey: 'shortcuts.reorder' },
      { keys: 'Drag topic', descriptionKey: 'shortcuts.drag' },
    ],
  },
  {
    titleKey: 'shortcuts.navigation',
    items: [
      { keys: 'Arrow keys', descriptionKey: 'shortcuts.navigate' },
      { keys: 'Esc', descriptionKey: 'shortcuts.escape' },
    ],
  },
  {
    titleKey: 'shortcuts.canvas',
    items: [
      { keys: 'Drag background', descriptionKey: 'shortcuts.pan' },
      { keys: 'Wheel', descriptionKey: 'shortcuts.wheel' },
      { keys: 'Ctrl + Wheel', descriptionKey: 'shortcuts.zoomPointer' },
      { keys: 'Ctrl + 0', descriptionKey: 'shortcuts.fit' },
      { keys: 'Ctrl + = / Ctrl + -', descriptionKey: 'shortcuts.zoom' },
    ],
  },
  {
    titleKey: 'shortcuts.history',
    items: [
      { keys: 'Ctrl + Z', descriptionKey: 'shortcuts.undo' },
      { keys: 'Ctrl + Shift + Z / Ctrl + Y', descriptionKey: 'shortcuts.redo' },
      { keys: '? / Ctrl + /', descriptionKey: 'shortcuts.panel' },
    ],
  },
]
