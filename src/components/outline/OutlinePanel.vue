<script setup lang="ts">
import { X } from '@lucide/vue'
import { computed, onBeforeUnmount, ref } from 'vue'

import { Button } from '@/components/ui/button'
import {
  resolveOutlineDrop,
  type OutlineDropMode,
  type OutlineDropTarget,
} from '@/domain/outline/drop'
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

const docStore = useDocumentStore()
const uiStore = useUiStore()
const { t } = useI18n()

const scrollRef = ref<HTMLDivElement | null>(null)
const drag = ref<DragState | null>(null)
const draggingId = computed(() => (drag.value?.active ? drag.value.nodeId : null))

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

onBeforeUnmount(stopDragging)
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
  </aside>
</template>
