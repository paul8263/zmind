<script setup lang="ts">
import {
  ArrowDown,
  ArrowUp,
  ChevronsDownUp,
  ChevronsUpDown,
  CornerDownRight,
  IndentDecrease,
  IndentIncrease,
  ListPlus,
  Pencil,
  Tags,
  Trash2,
  X,
} from '@lucide/vue'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, type Component } from 'vue'

import { Button } from '@/components/ui/button'
import { findNode } from '@/domain/model/tree'
import {
  resolveOutlineDrop,
  type OutlineDropMode,
  type OutlineDropTarget,
} from '@/domain/outline/drop'
import { resolveOutlineMove, type OutlineMoveAction } from '@/domain/outline/move'
import { useI18n } from '@/i18n'
import { useDocumentStore } from '@/stores/document'
import { useUiStore } from '@/stores/ui'

import OutlineNode from './OutlineNode.vue'

interface OutlineDropHint extends OutlineDropTarget {
  style: Record<string, string>
}

interface DragState {
  nodeId: string
  startX: number
  startY: number
  active: boolean
  hint: OutlineDropHint | null
}

interface ContextMenuState {
  nodeId: string
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

const docStore = useDocumentStore()
const uiStore = useUiStore()
const { t } = useI18n()

const scrollRef = ref<HTMLDivElement | null>(null)
const contextMenuRef = ref<HTMLDivElement | null>(null)
const contextMenu = ref<ContextMenuState | null>(null)
const drag = ref<DragState | null>(null)
const draggingId = computed(() => (drag.value?.active ? drag.value.nodeId : null))

const contextMenuStyle = computed(() => ({
  left: `${contextMenu.value?.x ?? 0}px`,
  top: `${contextMenu.value?.y ?? 0}px`,
}))

const contextMenuItems = computed<ContextMenuItem[]>(() => {
  const state = contextMenu.value
  if (!state) return []

  const node = findNode(docStore.doc.root, state.nodeId)
  if (!node) return []

  const doc = docStore.doc
  const isRoot = node.id === doc.root.id
  const hasChildren = node.children.length > 0

  const move = (action: OutlineMoveAction) => {
    const target = resolveOutlineMove(doc, node.id, action)
    if (!target) return

    docStore.move(node.id, target.newParentId, target.index)
    docStore.select(node.id)
  }

  return [
    {
      id: 'edit',
      label: t('context.edit'),
      icon: Pencil,
      action: () => docStore.startEditing(node.id, 'outline'),
    },
    {
      id: 'add-child',
      label: t('context.addChild'),
      icon: CornerDownRight,
      action: () => docStore.addChildTo(node.id, 'outline'),
    },
    {
      id: 'add-sibling',
      label: t('context.addSibling'),
      icon: ListPlus,
      disabled: isRoot,
      action: () => docStore.addSiblingTo(node.id, 'outline'),
    },
    {
      id: 'markers',
      label: t('context.markers'),
      icon: Tags,
      action: () => {
        docStore.select(node.id)
        uiStore.openMarkers()
      },
    },
    {
      id: 'move-up',
      label: t('context.moveUp'),
      icon: ArrowUp,
      disabled: resolveOutlineMove(doc, node.id, 'up') === null,
      action: () => move('up'),
    },
    {
      id: 'move-down',
      label: t('context.moveDown'),
      icon: ArrowDown,
      disabled: resolveOutlineMove(doc, node.id, 'down') === null,
      action: () => move('down'),
    },
    {
      id: 'promote',
      label: t('context.promote'),
      icon: IndentDecrease,
      disabled: resolveOutlineMove(doc, node.id, 'promote') === null,
      action: () => move('promote'),
    },
    {
      id: 'demote',
      label: t('context.demote'),
      icon: IndentIncrease,
      disabled: resolveOutlineMove(doc, node.id, 'demote') === null,
      action: () => move('demote'),
    },
    {
      id: 'toggle',
      label: node.collapsed ? t('topic.expand') : t('topic.collapse'),
      icon: node.collapsed ? ChevronsUpDown : ChevronsDownUp,
      disabled: !hasChildren,
      action: () => docStore.toggle(node.id),
    },
    {
      id: 'delete',
      label: t('context.delete'),
      icon: Trash2,
      disabled: isRoot,
      danger: true,
      action: () => docStore.remove(node.id),
    },
  ]
})

function rowElements() {
  const root = scrollRef.value
  return root ? Array.from(root.querySelectorAll<HTMLElement>('[data-outline-node]')) : []
}

function rowAt(clientX: number, clientY: number) {
  for (const row of rowElements()) {
    const rect = row.getBoundingClientRect()
    if (clientX < rect.left || clientX > rect.right) continue
    if (clientY >= rect.top && clientY <= rect.bottom) return row
  }

  return null
}

function resolveHint(nodeId: string, clientX: number, clientY: number) {
  const row = rowAt(clientX, clientY)
  const container = scrollRef.value
  const targetId = row?.dataset.outlineNode
  if (!row || !container || !targetId) return null

  const rect = row.getBoundingClientRect()
  const ratio = (clientY - rect.top) / Math.max(rect.height, 1)
  const mode: OutlineDropMode = ratio < 0.25 ? 'before' : ratio > 0.75 ? 'after' : 'child'
  const target = resolveOutlineDrop(docStore.doc, nodeId, targetId, mode)
  if (!target) return null

  const containerRect = container.getBoundingClientRect()
  const top = rect.top - containerRect.top + container.scrollTop
  const left = rect.left - containerRect.left + container.scrollLeft

  if (target.mode === 'child') {
    return {
      ...target,
      style: {
        top: `${top}px`,
        left: `${left + 2}px`,
        width: `${rect.width - 4}px`,
        height: `${rect.height}px`,
      },
    }
  }

  return {
    ...target,
    style: {
      top: `${target.mode === 'before' ? top - 1 : top + rect.height - 1}px`,
      left: `${left + 4}px`,
      width: `${rect.width - 8}px`,
      height: '2px',
    },
  }
}

function stopDragging() {
  drag.value = null
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('keydown', onDragKeyDown)
}

function onPointerDown(event: PointerEvent) {
  if (event.button !== 0 || docStore.editingNodeId) return

  const target = event.target
  if (!(target instanceof HTMLElement)) return
  if (target.closest('button, textarea, input, select, [contenteditable="true"]')) return

  const row = target.closest<HTMLElement>('[data-outline-node]')
  const nodeId = row?.dataset.outlineNode
  if (!nodeId || nodeId === docStore.doc.root.id) return

  drag.value = {
    nodeId,
    startX: event.clientX,
    startY: event.clientY,
    active: false,
    hint: null,
  }
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('keydown', onDragKeyDown)
}

function onPointerMove(event: PointerEvent) {
  const state = drag.value
  if (!state) return

  if (!state.active) {
    const distance = Math.hypot(event.clientX - state.startX, event.clientY - state.startY)
    if (distance < 4) return

    state.active = true
  }

  state.hint = resolveHint(state.nodeId, event.clientX, event.clientY)
}

function onPointerUp() {
  const state = drag.value
  if (!state) return

  const hint = state.hint
  if (state.active && hint) {
    docStore.move(state.nodeId, hint.newParentId, hint.index)
    docStore.select(state.nodeId)
  }

  stopDragging()
}

function onDragKeyDown(event: KeyboardEvent) {
  if (event.key !== 'Escape') return

  event.preventDefault()
  stopDragging()
}

function onContextMenu(event: MouseEvent) {
  const target = event.target
  if (!(target instanceof HTMLElement)) return
  if (target.closest('textarea, input, select, [contenteditable="true"]')) return

  const row = target.closest<HTMLElement>('[data-outline-node]')
  const nodeId = row?.dataset.outlineNode
  if (!nodeId) return

  event.preventDefault()
  openContextMenu(nodeId, event)
}

function openContextMenu(nodeId: string, event: MouseEvent) {
  docStore.select(nodeId)
  contextMenu.value = { nodeId, x: event.clientX, y: event.clientY }

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
      .querySelector<HTMLButtonElement>('[data-outline-context-item]:not(:disabled)')
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
    element.querySelectorAll<HTMLButtonElement>('[data-outline-context-item]:not(:disabled)'),
  )
  if (items.length === 0) return

  const index = items.indexOf(document.activeElement as HTMLButtonElement)
  const next = index < 0 ? 0 : (index + direction + items.length) % items.length
  items[next]?.focus({ preventScroll: true })
}

function onContextMenuKeyDown(event: KeyboardEvent) {
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

function onWindowPointerDown(event: PointerEvent) {
  if (!contextMenu.value) return

  const target = event.target
  if (target instanceof Node && contextMenuRef.value?.contains(target)) return

  closeContextMenu()
}

function onWindowBlur() {
  closeContextMenu()
}

onMounted(() => {
  window.addEventListener('pointerdown', onWindowPointerDown)
  window.addEventListener('blur', onWindowBlur)
})

onBeforeUnmount(() => {
  stopDragging()
  window.removeEventListener('pointerdown', onWindowPointerDown)
  window.removeEventListener('blur', onWindowBlur)
})
</script>

<template>
  <aside
    class="flex h-full w-64 shrink-0 flex-col border-r border-border bg-card text-card-foreground"
    data-outline-panel
  >
    <div class="flex h-9 shrink-0 items-center justify-between border-b border-border px-3">
      <h2 class="text-xs font-semibold tracking-wide text-muted-foreground">
        {{ t('outline.title') }}
      </h2>
      <Button
        variant="ghost"
        size="icon-sm"
        :aria-label="t('inspector.close')"
        :title="t('app.outline')"
        @click="uiStore.toggleOutline()"
      >
        <X />
      </Button>
    </div>

    <div
      ref="scrollRef"
      class="relative min-h-0 flex-1 overflow-auto p-2"
      @pointerdown="onPointerDown"
      @contextmenu="onContextMenu"
      @scroll="closeContextMenu"
    >
      <p v-if="!docStore.doc.root" class="px-2 py-4 text-xs text-muted-foreground">
        {{ t('outline.empty') }}
      </p>
      <OutlineNode v-else :node="docStore.doc.root" :depth="0" :dragging-id="draggingId" />

      <div
        v-if="drag?.hint"
        class="pointer-events-none absolute z-10"
        :class="
          drag.hint.mode === 'child'
            ? 'rounded-md border-2 border-sky-500 bg-sky-400/10'
            : 'rounded-full bg-sky-500'
        "
        :style="drag.hint.style"
        :data-outline-drop="drag.hint.mode"
      />
    </div>

    <div
      v-if="contextMenu"
      ref="contextMenuRef"
      class="fixed z-40 w-56 overflow-hidden rounded-lg border border-border bg-card p-1 text-card-foreground shadow-xl"
      :style="contextMenuStyle"
      data-outline-context-menu
      :data-outline-context-node="contextMenu.nodeId"
      role="menu"
      :aria-label="t('outline.menu')"
      @pointerdown.stop
      @contextmenu.stop.prevent
      @wheel.stop
      @keydown="onContextMenuKeyDown"
    >
      <div
        class="px-2 py-1 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase"
      >
        {{ t('outline.menu') }}
      </div>
      <button
        v-for="item in contextMenuItems"
        :key="item.id"
        type="button"
        role="menuitem"
        class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors outline-none hover:bg-accent focus:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
        :class="{ 'text-red-500 hover:bg-red-500/10 focus:bg-red-500/10': item.danger }"
        :data-outline-context-item="item.id"
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
  </aside>
</template>
