<script setup lang="ts">
import { ArrowLeft, ArrowRight, Copy, Pencil, Plus, Trash2 } from '@lucide/vue'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, type Component } from 'vue'

import { useI18n } from '@/i18n'
import { useDocumentStore } from '@/stores/document'

interface ContextMenuState {
  sheetId: string
  x: number
  y: number
}

interface ContextMenuItem {
  id: string
  label: string
  icon: Component
  disabled?: boolean
  danger?: boolean
  action: () => void
}

interface DragState {
  sheetId: string
  startX: number
  active: boolean
  insertIndex: number | null
}

const docStore = useDocumentStore()
const { t } = useI18n()

const scrollRef = ref<HTMLDivElement | null>(null)
const contextMenuRef = ref<HTMLDivElement | null>(null)
const contextMenu = ref<ContextMenuState | null>(null)
const editingId = ref<string | null>(null)
const editValue = ref('')
const pendingDeleteId = ref<string | null>(null)
const drag = ref<DragState | null>(null)
let editFinished = false
let suppressClick = false

const contextMenuStyle = computed(() => ({
  left: `${contextMenu.value?.x ?? 0}px`,
  top: `${contextMenu.value?.y ?? 0}px`,
}))

const deleteName = computed(() => {
  if (!pendingDeleteId.value) return ''
  return docStore.findSheet(pendingDeleteId.value)?.title ?? ''
})

const contextMenuItems = computed<ContextMenuItem[]>(() => {
  const state = contextMenu.value
  if (!state) return []

  const index = docStore.sheets.findIndex((sheet) => sheet.id === state.sheetId)
  if (index < 0) return []

  const sheet = docStore.sheets[index]

  return [
    {
      id: 'rename',
      label: t('sheet.rename'),
      icon: Pencil,
      action: () => startRename(sheet.id),
    },
    {
      id: 'duplicate',
      label: t('sheet.duplicate'),
      icon: Copy,
      action: () => docStore.duplicateSheet(sheet.id),
    },
    {
      id: 'move-left',
      label: t('sheet.moveLeft'),
      icon: ArrowLeft,
      disabled: index === 0,
      action: () => docStore.moveSheet(sheet.id, index - 1),
    },
    {
      id: 'move-right',
      label: t('sheet.moveRight'),
      icon: ArrowRight,
      disabled: index === docStore.sheets.length - 1,
      action: () => docStore.moveSheet(sheet.id, index + 1),
    },
    {
      id: 'delete',
      label: t('sheet.delete'),
      icon: Trash2,
      disabled: docStore.sheets.length <= 1,
      danger: true,
      action: () => requestDelete(sheet.id),
    },
  ]
})

const dropIndicatorStyle = computed(() => {
  const state = drag.value
  const container = scrollRef.value
  if (!state?.active || state.insertIndex === null || !container) return {}

  const tabs = Array.from(container.querySelectorAll<HTMLElement>('[data-sheet-tab]'))
  const target = tabs[state.insertIndex]
  const containerRect = container.getBoundingClientRect()

  if (target) {
    const rect = target.getBoundingClientRect()
    return {
      left: `${rect.left - containerRect.left + container.scrollLeft - 2}px`,
    }
  }

  const last = tabs[tabs.length - 1]
  if (!last) return {}

  const rect = last.getBoundingClientRect()
  return { left: `${rect.right - containerRect.left + container.scrollLeft + 1}px` }
})

function switchTo(id: string) {
  if (id === docStore.activeSheetId) return

  if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
    document.activeElement.blur()
  }
  docStore.switchSheet(id)
}

function onTabClick(id: string) {
  if (suppressClick) return
  switchTo(id)
}

function startRename(id: string) {
  closeContextMenu()
  const sheet = docStore.findSheet(id)
  if (!sheet) return

  editingId.value = id
  editValue.value = sheet.title
  editFinished = false

  nextTick(() => {
    const input = scrollRef.value?.querySelector<HTMLInputElement>('[data-sheet-rename]')
    input?.focus()
    input?.select()
  })
}

function commitRename() {
  if (editFinished || !editingId.value) return

  editFinished = true
  docStore.renameSheet(editingId.value, editValue.value)
  editingId.value = null
}

function cancelRename() {
  if (editFinished) return

  editFinished = true
  editingId.value = null
}

function onRenameKeydown(event: KeyboardEvent) {
  event.stopPropagation()

  if (event.key === 'Enter') {
    event.preventDefault()
    commitRename()
  } else if (event.key === 'Escape') {
    event.preventDefault()
    cancelRename()
  }
}

function onWheel(event: WheelEvent) {
  const container = scrollRef.value
  if (!container) return

  event.preventDefault()
  container.scrollLeft += event.deltaY || event.deltaX
}

function openContextMenu(sheetId: string, event: MouseEvent) {
  contextMenu.value = { sheetId, x: event.clientX, y: event.clientY }

  nextTick(() => {
    const element = contextMenuRef.value
    if (!element || !contextMenu.value) return

    const rect = element.getBoundingClientRect()
    contextMenu.value.x = Math.max(
      8,
      Math.min(contextMenu.value.x, window.innerWidth - rect.width - 8),
    )
    contextMenu.value.y = Math.max(
      8,
      Math.min(contextMenu.value.y, window.innerHeight - rect.height - 8),
    )
    element
      .querySelector<HTMLButtonElement>('[data-sheet-context-item]:not(:disabled)')
      ?.focus({ preventScroll: true })
  })
}

function closeContextMenu() {
  contextMenu.value = null
}

function runContextItem(item: ContextMenuItem) {
  if (item.disabled) return

  closeContextMenu()
  item.action()
}

function focusContextItem(direction: 1 | -1) {
  const element = contextMenuRef.value
  if (!element) return

  const items = Array.from(
    element.querySelectorAll<HTMLButtonElement>('[data-sheet-context-item]:not(:disabled)'),
  )
  if (items.length === 0) return

  const index = items.indexOf(document.activeElement as HTMLButtonElement)
  const next = index < 0 ? 0 : (index + direction + items.length) % items.length
  items[next]?.focus({ preventScroll: true })
}

function onContextMenuKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    closeContextMenu()
  } else if (event.key === 'ArrowDown') {
    event.preventDefault()
    focusContextItem(1)
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    focusContextItem(-1)
  }
}

function requestDelete(id: string) {
  closeContextMenu()
  if (docStore.sheets.length <= 1) return
  pendingDeleteId.value = id
}

function confirmDelete() {
  const id = pendingDeleteId.value
  pendingDeleteId.value = null
  if (id) docStore.removeSheet(id)
}

function onWindowPointerDown(event: PointerEvent) {
  if (!contextMenu.value) return

  const target = event.target
  if (target instanceof Node && contextMenuRef.value?.contains(target)) return

  closeContextMenu()
}

function onWindowBlur() {
  closeContextMenu()
}

function onTabPointerDown(sheetId: string, event: PointerEvent) {
  if (event.button !== 0 || editingId.value === sheetId) return

  drag.value = { sheetId, startX: event.clientX, active: false, insertIndex: null }
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
}

function onPointerMove(event: PointerEvent) {
  const state = drag.value
  const container = scrollRef.value
  if (!state || !container) return

  if (!state.active) {
    if (Math.abs(event.clientX - state.startX) < 6) return
    state.active = true
  }

  const tabs = Array.from(container.querySelectorAll<HTMLElement>('[data-sheet-tab]'))
  let insertIndex = tabs.length
  for (let index = 0; index < tabs.length; index += 1) {
    const rect = tabs[index].getBoundingClientRect()
    if (event.clientX < rect.left + rect.width / 2) {
      insertIndex = index
      break
    }
  }

  state.insertIndex = insertIndex
}

function onPointerUp() {
  const state = drag.value
  if (!state) return

  if (state.active && state.insertIndex !== null) {
    const from = docStore.sheets.findIndex((sheet) => sheet.id === state.sheetId)
    const target = state.insertIndex > from ? state.insertIndex - 1 : state.insertIndex
    if (docStore.moveSheet(state.sheetId, target)) {
      suppressClick = true
      setTimeout(() => {
        suppressClick = false
      }, 0)
    }
  }

  stopDragging()
}

function stopDragging() {
  drag.value = null
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
}

function onWindowKeyDown(event: KeyboardEvent) {
  if (!(event.ctrlKey || event.metaKey)) return
  if (event.key !== 'PageDown' && event.key !== 'PageUp') return

  const target = event.target
  if (
    target instanceof HTMLElement &&
    target.closest('input, textarea, [contenteditable="true"]')
  ) {
    return
  }
  if (docStore.editingNodeId) return

  const sheets = docStore.sheets
  const index = sheets.findIndex((sheet) => sheet.id === docStore.activeSheetId)
  if (index < 0) return

  event.preventDefault()

  if (event.shiftKey) {
    const next = event.key === 'PageDown' ? index + 1 : index - 1
    if (next >= 0 && next < sheets.length) docStore.moveSheet(sheets[index].id, next)
    return
  }

  const next =
    event.key === 'PageDown'
      ? (index + 1) % sheets.length
      : (index - 1 + sheets.length) % sheets.length
  switchTo(sheets[next].id)
}

onMounted(() => {
  window.addEventListener('pointerdown', onWindowPointerDown)
  window.addEventListener('blur', onWindowBlur)
  window.addEventListener('keydown', onWindowKeyDown)
})

onBeforeUnmount(() => {
  stopDragging()
  window.removeEventListener('pointerdown', onWindowPointerDown)
  window.removeEventListener('blur', onWindowBlur)
  window.removeEventListener('keydown', onWindowKeyDown)
})
</script>

<template>
  <div
    class="flex h-9 shrink-0 items-center gap-1 border-t border-border bg-card px-2 text-card-foreground"
    data-sheet-bar
    role="tablist"
    :aria-label="t('sheet.bar')"
  >
    <div
      ref="scrollRef"
      class="relative flex min-w-0 flex-1 items-center gap-1 overflow-x-auto overflow-y-hidden"
      @wheel="onWheel"
    >
      <div v-for="sheet in docStore.sheets" :key="sheet.id" class="shrink-0">
        <input
          v-if="editingId === sheet.id"
          v-model="editValue"
          class="h-6 w-32 rounded-md border border-sky-400 bg-background px-2 text-xs text-foreground outline-none"
          spellcheck="false"
          data-sheet-rename
          @keydown="onRenameKeydown"
          @blur="commitRename"
        />
        <button
          v-else
          type="button"
          role="tab"
          class="h-6 max-w-40 truncate rounded-md border px-2 text-xs transition-colors"
          :class="
            sheet.id === docStore.activeSheetId
              ? 'border-sky-300 bg-sky-100 text-sky-900 dark:border-sky-500/50 dark:bg-sky-500/25 dark:text-sky-50'
              : 'border-transparent text-muted-foreground hover:bg-accent hover:text-foreground'
          "
          :data-sheet-tab="sheet.id"
          :data-sheet-active="sheet.id === docStore.activeSheetId ? 'true' : 'false'"
          :aria-selected="sheet.id === docStore.activeSheetId"
          @click="onTabClick(sheet.id)"
          @dblclick.stop="startRename(sheet.id)"
          @contextmenu.prevent.stop="openContextMenu(sheet.id, $event)"
          @pointerdown="onTabPointerDown(sheet.id, $event)"
        >
          {{ sheet.title }}
        </button>
      </div>

      <div
        v-if="drag?.active && drag.insertIndex !== null"
        class="pointer-events-none absolute top-1 bottom-1 w-0.5 rounded-full bg-sky-500"
        :style="dropIndicatorStyle"
        data-sheet-drop
      />
    </div>

    <button
      type="button"
      class="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
      :title="t('sheet.new')"
      :aria-label="t('sheet.new')"
      data-sheet-add
      @click="docStore.addSheet()"
    >
      <Plus class="size-3.5" />
    </button>

    <div
      v-if="contextMenu"
      ref="contextMenuRef"
      class="fixed z-40 w-44 overflow-hidden rounded-lg border border-border bg-card p-1 text-card-foreground shadow-xl"
      :style="contextMenuStyle"
      data-sheet-context-menu
      :data-sheet-context-id="contextMenu.sheetId"
      role="menu"
      :aria-label="t('sheet.bar')"
      @pointerdown.stop
      @contextmenu.stop.prevent
      @wheel.stop
      @keydown="onContextMenuKeydown"
    >
      <button
        v-for="item in contextMenuItems"
        :key="item.id"
        type="button"
        role="menuitem"
        class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors outline-none hover:bg-accent focus:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
        :class="{ 'text-red-500 hover:bg-red-500/10 focus:bg-red-500/10': item.danger }"
        :data-sheet-context-item="item.id"
        :disabled="item.disabled"
        @click="runContextItem(item)"
      >
        <component
          :is="item.icon"
          class="size-3.5 shrink-0"
          :class="item.danger ? 'text-red-500' : 'text-muted-foreground'"
        />
        <span class="min-w-0 flex-1 truncate">{{ item.label }}</span>
      </button>
    </div>

    <div
      v-if="pendingDeleteId"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 p-6 backdrop-blur-[2px]"
      data-sheet-delete-dialog
      @pointerdown.self="pendingDeleteId = null"
    >
      <div class="w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-2xl">
        <h2 class="text-sm font-semibold">{{ t('sheet.deleteTitle') }}</h2>
        <p class="mt-2 text-xs text-muted-foreground">
          {{ t('sheet.deleteConfirm', { name: deleteName }) }}
        </p>
        <div class="mt-4 flex justify-end gap-2">
          <button
            type="button"
            class="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent"
            data-sheet-delete-cancel
            @click="pendingDeleteId = null"
          >
            {{ t('app.cancel') }}
          </button>
          <button
            type="button"
            class="rounded-md bg-red-500 px-3 py-1.5 text-xs text-white hover:bg-red-600"
            data-sheet-delete-confirm
            @click="confirmDelete"
          >
            {{ t('sheet.delete') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
