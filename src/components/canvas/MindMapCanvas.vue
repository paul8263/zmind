<script setup lang="ts">
import {
  CornerDownRight,
  Keyboard as KeyboardIcon,
  ListPlus,
  Maximize,
  Minus,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from '@lucide/vue'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, type Component } from 'vue'

import { Button } from '@/components/ui/button'
import { useLayout } from '@/composables/useLayout'
import { cullLayout } from '@/domain/layout/culling'
import { resolveDropTarget, type DropTarget } from '@/domain/layout/drop'
import type { LayoutNode } from '@/domain/layout/logical'
import { resolveNodeStyle } from '@/domain/layout/style'
import { SHORTCUT_GROUPS } from '@/domain/shortcuts'
import { useI18n } from '@/i18n'
import { useDocumentStore } from '@/stores/document'
import { useUiStore } from '@/stores/ui'
import { useViewportStore } from '@/stores/viewport'

import ConnectionLayer from './ConnectionLayer.vue'
import EmptyCanvasState from './EmptyCanvasState.vue'
import TopicNodeView from './TopicNodeView.vue'

interface DragState {
  nodeId: string
  pointerId: number
  startX: number
  startY: number
  offsetX: number
  offsetY: number
  worldX: number
  worldY: number
  active: boolean
  target: DropTarget | null
}

type ContextMenuKind = 'node' | 'canvas'

interface ContextMenuState {
  kind: ContextMenuKind
  nodeId: string | null
  x: number
  y: number
}

interface ContextMenuItem {
  id: string
  label: string
  shortcut?: string
  icon: Component
  disabled?: boolean
  danger?: boolean
  action: () => void
}

const docStore = useDocumentStore()
const uiStore = useUiStore()
const viewportStore = useViewportStore()
const { theme, layout } = useLayout()
const { t } = useI18n()

const containerRef = ref<HTMLDivElement | null>(null)
const drag = ref<DragState | null>(null)
const shortcutsOpen = ref(false)
const canvasSize = ref({ width: 0, height: 0 })
const contextMenu = ref<ContextMenuState | null>(null)
const contextMenuRef = ref<HTMLDivElement | null>(null)
const isOrgDown = computed(() => docStore.doc.structure === 'org-down')
const transformStyle = computed(() => ({
  transform: `translate(${viewportStore.x}px, ${viewportStore.y}px) scale(${viewportStore.scale})`,
}))
const zoomPercent = computed(() => Math.round(viewportStore.scale * 100))
const visibleViewport = computed(() => {
  const { width, height } = canvasSize.value
  if (!width || !height) return null

  const scale = viewportStore.scale
  const margin = 200 / scale
  return {
    x: -viewportStore.x / scale - margin,
    y: -viewportStore.y / scale - margin,
    width: width / scale + margin * 2,
    height: height / scale + margin * 2,
  }
})
const renderLayout = computed(() => {
  const viewport = visibleViewport.value
  if (!viewport) return layout.value

  const culled = cullLayout(layout.value, viewport)
  const editingId = docStore.editingNodeId
  if (editingId && !culled.nodes.some((node) => node.id === editingId)) {
    const editingNode = layout.value.byId.get(editingId)
    if (editingNode) return { ...culled, nodes: [...culled.nodes, editingNode] }
  }
  return culled
})
const isEmpty = computed(() => docStore.doc.root.children.length === 0 && !docStore.editingNodeId)
const contextNode = computed(() => {
  const state = contextMenu.value
  return state?.nodeId ? layout.value.byId.get(state.nodeId) : undefined
})
const contextMenuStyle = computed(() => ({
  left: `${contextMenu.value?.x ?? 0}px`,
  top: `${contextMenu.value?.y ?? 0}px`,
}))
const contextMenuItems = computed<ContextMenuItem[]>(() => {
  const state = contextMenu.value
  if (!state) return []

  if (state.kind === 'canvas') {
    const items: ContextMenuItem[] = [
      {
        id: 'fit',
        label: t('canvas.fit'),
        shortcut: 'Ctrl+0',
        icon: Maximize,
        action: fitToView,
      },
      {
        id: 'reset-zoom',
        label: t('canvas.zoomReset'),
        icon: RotateCcw,
        action: resetZoom,
      },
    ]

    if (isEmpty.value) {
      items.push({
        id: 'add-first',
        label: t('empty.add'),
        icon: Plus,
        action: () => docStore.addChildTo(docStore.doc.root.id),
      })
    }

    return items
  }

  const node = contextNode.value
  if (!node) return []

  const isRoot = node.parentId === null
  const hasChildren = node.node.children.length > 0

  return [
    {
      id: 'edit',
      label: t('context.edit'),
      shortcut: 'F2',
      icon: Pencil,
      action: () => docStore.startEditing(node.id),
    },
    {
      id: 'add-child',
      label: t('context.addChild'),
      shortcut: 'Tab',
      icon: CornerDownRight,
      action: () => docStore.addChildTo(node.id),
    },
    {
      id: 'add-sibling',
      label: t('context.addSibling'),
      shortcut: 'Enter',
      icon: ListPlus,
      disabled: isRoot,
      action: () => docStore.addSiblingTo(node.id),
    },
    {
      id: 'toggle',
      label: node.node.collapsed ? t('topic.expand') : t('topic.collapse'),
      shortcut: 'Space',
      icon: node.node.collapsed ? Plus : Minus,
      disabled: !hasChildren,
      action: () => docStore.toggle(node.id),
    },
    {
      id: 'delete',
      label: t('context.delete'),
      shortcut: 'Del',
      icon: Trash2,
      disabled: isRoot,
      danger: true,
      action: () => docStore.remove(node.id),
    },
  ]
})

const dragNode = computed(() => {
  const state = drag.value
  return state ? layout.value.byId.get(state.nodeId) : undefined
})

const dropNode = computed(() => {
  const state = drag.value
  const target = state?.target
  return target ? layout.value.byId.get(target.nodeId) : undefined
})

const ghostStyle = computed(() => {
  const state = drag.value
  const node = dragNode.value
  if (!state || !node) return undefined

  const style = resolveNodeStyle(node.depth, node.branchColor, node.node.style, theme.value)

  return {
    left: `${state.worldX - state.offsetX}px`,
    top: `${state.worldY - state.offsetY}px`,
    width: `${node.width}px`,
    height: `${node.height}px`,
    padding: `${style.paddingY}px ${style.paddingX}px`,
    borderRadius:
      typeof style.borderRadius === 'number' ? `${style.borderRadius}px` : style.borderRadius,
    fontSize: `${style.fontSize}px`,
    fontWeight: style.fontWeight,
    lineHeight: style.lineHeight,
    borderColor: style.borderColor,
    background: style.fill,
    color: style.textColor,
  }
})

const dropIndicator = computed(() => {
  const state = drag.value
  const node = dropNode.value
  const target = state?.target
  if (!node || !target) return null

  if (target.mode === 'child') {
    return {
      kind: 'child' as const,
      style: {
        left: `${node.x - 3}px`,
        top: `${node.y - 3}px`,
        width: `${node.width + 6}px`,
        height: `${node.height + 6}px`,
        borderRadius: `${node.visual.borderRadius + 3}px`,
      },
    }
  }

  if (isOrgDown.value) {
    return {
      kind: 'line' as const,
      style: {
        left: target.mode === 'before' ? `${node.x - 5}px` : `${node.x + node.width + 2}px`,
        top: `${node.y}px`,
        width: '3px',
        height: `${node.height}px`,
      },
    }
  }

  return {
    kind: 'line' as const,
    style: {
      left: `${node.x}px`,
      top: target.mode === 'before' ? `${node.y - 5}px` : `${node.y + node.height + 2}px`,
      width: `${node.width}px`,
      height: '3px',
    },
  }
})

let panning = false
let lastPointerX = 0
let lastPointerY = 0
let hasFitted = false
let resizeObserver: ResizeObserver | null = null

function containerSize() {
  const element = containerRef.value
  return {
    width: element?.clientWidth ?? 0,
    height: element?.clientHeight ?? 0,
  }
}

function measureContainer() {
  canvasSize.value = containerSize()
}

function nodeMemo(node: LayoutNode) {
  return [
    node.id,
    node.node.title,
    node.node.collapsed,
    node.node.children.length,
    node.node.style,
    node.depth,
    node.x,
    node.y,
    node.width,
    node.height,
    node.branchColor,
    docStore.selectedNodeId === node.id,
    docStore.editingNodeId === node.id && docStore.editingSource === 'canvas',
    drag.value?.active === true && drag.value.nodeId === node.id,
    theme.value,
  ]
}

function toWorld(clientX: number, clientY: number) {
  const rect = containerRef.value?.getBoundingClientRect()
  if (!rect) return { x: 0, y: 0 }

  return {
    x: (clientX - rect.left - viewportStore.x) / viewportStore.scale,
    y: (clientY - rect.top - viewportStore.y) / viewportStore.scale,
  }
}

function fitToView() {
  const { width, height } = containerSize()
  if (!width || !height) return

  const bounds = layout.value.bounds
  const padding = 96
  const fitScale = Math.min(
    (width - padding * 2) / Math.max(bounds.width, 1),
    (height - padding * 2) / Math.max(bounds.height, 1),
    1,
  )
  const scale = Math.min(3, Math.max(0.2, fitScale))

  viewportStore.set(
    (width - bounds.width * scale) / 2 - bounds.x * scale,
    (height - bounds.height * scale) / 2 - bounds.y * scale,
    scale,
  )
  hasFitted = true
  containerRef.value?.focus({ preventScroll: true })
}

function zoomAtCenter(factor: number) {
  const { width, height } = containerSize()
  viewportStore.zoomAt(width / 2, height / 2, factor)
  containerRef.value?.focus({ preventScroll: true })
}

function zoomIn() {
  zoomAtCenter(1.2)
}

function zoomOut() {
  zoomAtCenter(1 / 1.2)
}

function resetZoom() {
  zoomAtCenter(1 / viewportStore.scale)
}

function closeContextMenu() {
  contextMenu.value = null
}

function openContextMenu(kind: ContextMenuKind, nodeId: string | null, event: MouseEvent) {
  if (shortcutsOpen.value || drag.value?.active) return

  const fallbackX = window.innerWidth / 2
  const fallbackY = window.innerHeight / 2
  contextMenu.value = {
    kind,
    nodeId,
    x: event.clientX || fallbackX,
    y: event.clientY || fallbackY,
  }

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
      .querySelector<HTMLButtonElement>('[data-context-item]:not(:disabled)')
      ?.focus({ preventScroll: true })
  })
}

function runContextItem(item: ContextMenuItem) {
  if (item.disabled) return
  closeContextMenu()
  item.action()
  nextTick(() => {
    if (!docStore.editingNodeId) containerRef.value?.focus({ preventScroll: true })
  })
}

function focusContextItem(direction: 1 | -1) {
  const items = Array.from(
    contextMenuRef.value?.querySelectorAll<HTMLButtonElement>(
      '[data-context-item]:not(:disabled)',
    ) ?? [],
  )
  if (items.length === 0) return

  const current = items.findIndex((item) => item === document.activeElement)
  const next = current < 0 ? 0 : (current + direction + items.length) % items.length
  items[next]?.focus({ preventScroll: true })
}

function onCanvasContextMenu(event: MouseEvent) {
  const target = event.target
  const isControl =
    target instanceof HTMLElement &&
    Boolean(target.closest('button, input, textarea, select, [contenteditable="true"]'))

  event.preventDefault()
  if (isControl) return
  openContextMenu('canvas', null, event)
}

function onNodeContextMenu(id: string, event: MouseEvent) {
  event.preventDefault()
  docStore.select(id)
  openContextMenu('node', id, event)
}

function onWindowPointerDown(event: PointerEvent) {
  if (!contextMenu.value) return
  const menu = contextMenuRef.value
  if (menu && event.target instanceof Node && menu.contains(event.target)) return
  closeContextMenu()
}

function onWindowBlur() {
  closeContextMenu()
}

function onWheel(event: WheelEvent) {
  const element = containerRef.value
  if (!element) return

  closeContextMenu()

  if (event.ctrlKey || event.metaKey) {
    const rect = element.getBoundingClientRect()
    const factor = Math.exp(-event.deltaY * 0.0015)
    viewportStore.zoomAt(event.clientX - rect.left, event.clientY - rect.top, factor)
  } else {
    viewportStore.panBy(-event.deltaX, -event.deltaY)
  }
}

function onBackgroundPointerDown(event: PointerEvent) {
  closeContextMenu()
  if (event.button !== 0 && event.button !== 1) return
  if (docStore.editingNodeId || drag.value || shortcutsOpen.value) return
  if (isEditableTarget(event.target)) return

  const element = event.currentTarget as HTMLElement
  element.focus({ preventScroll: true })
  if (event.button === 0) docStore.clearSelection()

  panning = true
  lastPointerX = event.clientX
  lastPointerY = event.clientY
  element.setPointerCapture(event.pointerId)
}

function onNodeDragStart(id: string, event: PointerEvent) {
  const node = layout.value.byId.get(id)
  if (!node?.parentId || docStore.editingNodeId) return

  closeContextMenu()
  const point = toWorld(event.clientX, event.clientY)
  drag.value = {
    nodeId: id,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    offsetX: point.x - node.x,
    offsetY: point.y - node.y,
    worldX: point.x,
    worldY: point.y,
    active: false,
    target: null,
  }
  containerRef.value?.focus({ preventScroll: true })
}

function updateDrag(event: PointerEvent) {
  const state = drag.value
  if (!state) return

  const point = toWorld(event.clientX, event.clientY)
  state.worldX = point.x
  state.worldY = point.y

  if (!state.active) {
    const distance = Math.hypot(event.clientX - state.startX, event.clientY - state.startY)
    if (distance < 4) return

    state.active = true
    containerRef.value?.setPointerCapture(state.pointerId)
  }

  state.target = resolveDropTarget(
    layout.value,
    state.nodeId,
    point.x,
    point.y,
    docStore.doc.structure,
  )
}

function finishDrag() {
  const state = drag.value
  if (!state) return false

  if (state.active && state.target) {
    docStore.move(state.nodeId, state.target.newParentId, state.target.index)
    docStore.select(state.nodeId)
  }

  drag.value = null
  if (containerRef.value?.hasPointerCapture(state.pointerId)) {
    containerRef.value.releasePointerCapture(state.pointerId)
  }
  return true
}

function cancelDrag() {
  const state = drag.value
  if (!state) return

  drag.value = null
  if (containerRef.value?.hasPointerCapture(state.pointerId)) {
    containerRef.value.releasePointerCapture(state.pointerId)
  }
}

function onPointerMove(event: PointerEvent) {
  if (drag.value) {
    updateDrag(event)
    return
  }
  if (!panning) return

  viewportStore.panBy(event.clientX - lastPointerX, event.clientY - lastPointerY)
  lastPointerX = event.clientX
  lastPointerY = event.clientY
}

function onPointerUp(event: PointerEvent) {
  if (finishDrag()) return
  if (!panning) return

  panning = false
  const element = event.currentTarget as HTMLElement
  if (element.hasPointerCapture(event.pointerId)) {
    element.releasePointerCapture(event.pointerId)
  }
}

function onPointerCancel(event: PointerEvent) {
  if (drag.value) {
    cancelDrag()
    return
  }
  onPointerUp(event)
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"], button'))
}

function selectParent(node?: LayoutNode) {
  if (!node) {
    docStore.select(docStore.doc.root.id)
    return
  }
  if (node.parentId) docStore.select(node.parentId)
}

function selectFirstChild(node?: LayoutNode) {
  if (!node) {
    docStore.select(docStore.doc.root.id)
    return
  }
  if (node.children.length > 0) docStore.select(node.children[0].id)
}

function selectSibling(node: LayoutNode | undefined, offset: number) {
  if (!node) {
    docStore.select(docStore.doc.root.id)
    return
  }

  const parent = node.parentId ? layout.value.byId.get(node.parentId) : undefined
  const root = layout.value.byId.get(docStore.doc.root.id)
  const siblings = parent ? parent.children : root ? [root] : []
  const index = siblings.findIndex((sibling) => sibling.id === node.id)
  if (index < 0) return

  const target = siblings[index + offset]
  if (target) docStore.select(target.id)
}

function moveSelected(offset: number) {
  const selectedId = docStore.selectedNodeId
  if (!selectedId) return

  const node = layout.value.byId.get(selectedId)
  if (!node?.parentId) return

  const parent = layout.value.byId.get(node.parentId)
  if (!parent) return

  const index = parent.children.findIndex((child) => child.id === node.id)
  const targetIndex = index + offset
  if (index < 0 || targetIndex < 0 || targetIndex >= parent.children.length) {
    return
  }

  docStore.move(node.id, parent.id, targetIndex)
}

function selectLeft(node?: LayoutNode) {
  if (isOrgDown.value) {
    selectSibling(node, -1)
  } else if (docStore.doc.structure === 'logic-left') {
    selectFirstChild(node)
  } else {
    selectParent(node)
  }
}

function selectRight(node?: LayoutNode) {
  if (isOrgDown.value) {
    selectSibling(node, 1)
  } else if (docStore.doc.structure === 'logic-left') {
    selectParent(node)
  } else {
    selectFirstChild(node)
  }
}

function onKeyDown(event: KeyboardEvent) {
  if (drag.value?.active) {
    if (event.key === 'Escape') {
      event.preventDefault()
      cancelDrag()
    }
    return
  }

  if (contextMenu.value) {
    if (event.key === 'Escape') {
      event.preventDefault()
      closeContextMenu()
      containerRef.value?.focus({ preventScroll: true })
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      focusContextItem(1)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      focusContextItem(-1)
    }
    return
  }

  if (shortcutsOpen.value) {
    if (
      event.key === 'Escape' ||
      event.key === '?' ||
      (event.key === '/' && (event.ctrlKey || event.metaKey))
    ) {
      event.preventDefault()
      closeShortcuts()
    }
    return
  }

  if (isEditableTarget(event.target) || docStore.editingNodeId) return

  const mod = event.ctrlKey || event.metaKey

  if (event.key === '?' || (mod && event.key === '/')) {
    event.preventDefault()
    shortcutsOpen.value = true
    return
  }

  const selectedId = docStore.selectedNodeId
  const selected = selectedId ? layout.value.byId.get(selectedId) : undefined

  switch (event.key) {
    case 'Tab':
      event.preventDefault()
      docStore.addChildTo(selectedId ?? undefined)
      break
    case 'Enter':
      event.preventDefault()
      docStore.addSiblingTo(selectedId ?? undefined)
      break
    case 'Delete':
    case 'Backspace':
      if (selectedId) {
        event.preventDefault()
        docStore.remove(selectedId)
      }
      break
    case 'F2':
      if (selectedId) {
        event.preventDefault()
        docStore.startEditing(selectedId)
      }
      break
    case ' ':
      if (selectedId) {
        event.preventDefault()
        docStore.toggle(selectedId)
      }
      break
    case 'Escape':
      event.preventDefault()
      docStore.clearSelection()
      break
    case 'ArrowLeft':
      event.preventDefault()
      if (event.altKey) {
        if (isOrgDown.value) moveSelected(-1)
      } else {
        selectLeft(selected)
      }
      break
    case 'ArrowRight':
      event.preventDefault()
      if (event.altKey) {
        if (isOrgDown.value) moveSelected(1)
      } else {
        selectRight(selected)
      }
      break
    case 'ArrowUp':
      event.preventDefault()
      if (event.altKey) {
        if (!isOrgDown.value) moveSelected(-1)
      } else if (isOrgDown.value) {
        selectParent(selected)
      } else {
        selectSibling(selected, -1)
      }
      break
    case 'ArrowDown':
      event.preventDefault()
      if (event.altKey) {
        if (!isOrgDown.value) moveSelected(1)
      } else if (isOrgDown.value) {
        selectFirstChild(selected)
      } else {
        selectSibling(selected, 1)
      }
      break
    case '0':
      if (mod) {
        event.preventDefault()
        fitToView()
      }
      break
    case '=':
    case '+':
      if (mod) {
        event.preventDefault()
        zoomIn()
      }
      break
    case '-':
      if (mod) {
        event.preventDefault()
        zoomOut()
      }
      break
  }
}

function ensureNodeVisible(nodeId: string) {
  const node = layout.value.byId.get(nodeId)
  if (!node) return

  const { width, height } = containerSize()
  const padding = 80
  const scale = viewportStore.scale
  const left = viewportStore.x + node.x * scale
  const top = viewportStore.y + node.y * scale
  const right = left + node.width * scale
  const bottom = top + node.height * scale

  let dx = 0
  let dy = 0

  if (left < padding) dx = padding - left
  else if (right > width - padding) dx = width - padding - right

  if (top < padding) dy = padding - top
  else if (bottom > height - padding) dy = height - padding - bottom

  if (dx !== 0 || dy !== 0) viewportStore.panBy(dx, dy)
}

function onSelect(id: string) {
  closeContextMenu()
  docStore.select(id)
  containerRef.value?.focus({ preventScroll: true })
}

function onEdit(id: string) {
  closeContextMenu()
  docStore.startEditing(id)
  containerRef.value?.focus({ preventScroll: true })
}

function onToggle(id: string) {
  closeContextMenu()
  docStore.toggle(id)
  containerRef.value?.focus({ preventScroll: true })
}

function onCommit(id: string, title: string) {
  docStore.rename(id, title)
}

function onCancel() {
  docStore.stopEditing()
}

function closeShortcuts() {
  shortcutsOpen.value = false
  nextTick(() => containerRef.value?.focus({ preventScroll: true }))
}

watch(
  () => docStore.selectedNodeId,
  (nodeId) => {
    if (nodeId) nextTick(() => ensureNodeVisible(nodeId))
  },
)

watch(
  () => docStore.doc.structure,
  () => nextTick(() => fitToView()),
)

watch(
  () => docStore.activeSheetId,
  (sheetId, previousId) => {
    if (previousId) viewportStore.remember(previousId)
    closeContextMenu()
    if (!viewportStore.recall(sheetId)) nextTick(() => fitToView())
  },
)

watch([() => uiStore.outlineOpen, () => uiStore.inspectorOpen], () => nextTick(() => fitToView()))

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('pointerdown', onWindowPointerDown)
  window.addEventListener('blur', onWindowBlur)
  measureContainer()
  nextTick(() => {
    measureContainer()
    fitToView()
  })

  if (typeof ResizeObserver !== 'undefined' && containerRef.value) {
    resizeObserver = new ResizeObserver(() => {
      measureContainer()
      closeContextMenu()
      if (!hasFitted) fitToView()
    })
    resizeObserver.observe(containerRef.value)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('pointerdown', onWindowPointerDown)
  window.removeEventListener('blur', onWindowBlur)
  resizeObserver?.disconnect()
})
</script>

<template>
  <div
    ref="containerRef"
    class="relative h-full w-full overflow-hidden outline-none"
    :class="{ 'cursor-grabbing': drag?.active }"
    :style="{ backgroundColor: theme.canvasBg }"
    data-mindmap-canvas
    :data-total-nodes="layout.nodes.length"
    :data-rendered-nodes="renderLayout.nodes.length"
    tabindex="-1"
    @pointerdown="onBackgroundPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerCancel"
    @wheel.prevent="onWheel"
    @contextmenu="onCanvasContextMenu"
  >
    <div
      class="absolute top-0 left-0 origin-top-left will-change-transform"
      :style="transformStyle"
    >
      <ConnectionLayer :connections="renderLayout.connections" :bounds="layout.bounds" />
      <TopicNodeView
        v-for="node in renderLayout.nodes"
        :key="node.id"
        v-memo="nodeMemo(node)"
        :node="node"
        :selected="docStore.selectedNodeId === node.id"
        :editing="docStore.editingNodeId === node.id && docStore.editingSource === 'canvas'"
        :dragging="drag?.active && drag.nodeId === node.id"
        :theme="theme"
        @select="onSelect"
        @edit="onEdit"
        @toggle="onToggle"
        @dragstart="onNodeDragStart"
        @commit="onCommit"
        @cancel="onCancel"
        @contextmenu="onNodeContextMenu"
      />

      <div
        v-if="dropIndicator?.kind === 'child'"
        class="pointer-events-none absolute border-2 border-dashed border-sky-500 bg-sky-400/10"
        :style="dropIndicator.style"
      />
      <div
        v-else-if="dropIndicator"
        class="pointer-events-none absolute rounded-full bg-sky-500 shadow-sm"
        :style="dropIndicator.style"
      />

      <div
        v-if="drag?.active && dragNode"
        class="pointer-events-none absolute flex items-center justify-center border-2 text-center opacity-90 shadow-xl"
        :style="ghostStyle"
      >
        <span class="w-full break-words whitespace-pre-wrap">
          {{ dragNode.node.title || t('topic.untitled') }}
        </span>
      </div>
    </div>

    <EmptyCanvasState v-if="isEmpty" />

    <div
      v-if="contextMenu"
      ref="contextMenuRef"
      class="fixed z-40 w-56 overflow-hidden rounded-lg border border-border bg-card p-1 text-card-foreground shadow-xl"
      :style="contextMenuStyle"
      data-context-menu
      :data-context-menu-kind="contextMenu.kind"
      role="menu"
      :aria-label="contextMenu.kind === 'node' ? t('context.nodeMenu') : t('context.canvasMenu')"
      @pointerdown.stop
      @contextmenu.stop.prevent
      @wheel.stop
    >
      <div
        class="px-2 py-1 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase"
      >
        {{ contextMenu.kind === 'node' ? t('context.nodeMenu') : t('context.canvasMenu') }}
      </div>
      <button
        v-for="item in contextMenuItems"
        :key="item.id"
        type="button"
        role="menuitem"
        class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors outline-none hover:bg-accent focus:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
        :class="{ 'text-red-500 hover:bg-red-500/10 focus:bg-red-500/10': item.danger }"
        :data-context-item="item.id"
        :disabled="item.disabled"
        @click="runContextItem(item)"
      >
        <component
          :is="item.icon"
          class="size-3.5 shrink-0"
          :class="item.danger ? 'text-red-500' : 'text-muted-foreground'"
        />
        <span class="min-w-0 flex-1 truncate">{{ item.label }}</span>
        <span v-if="item.shortcut" class="shrink-0 font-mono text-[10px] text-muted-foreground">
          {{ item.shortcut }}
        </span>
      </button>
    </div>

    <div
      class="absolute right-4 bottom-4 flex items-center gap-1 rounded-lg border border-border bg-card/90 p-1 text-card-foreground shadow-sm backdrop-blur"
      @pointerdown.stop="closeContextMenu"
    >
      <Button variant="ghost" size="icon-sm" :aria-label="t('canvas.zoomOut')" @click="zoomOut">
        <Minus />
      </Button>
      <button
        type="button"
        class="w-12 text-center text-xs text-muted-foreground tabular-nums"
        :title="t('canvas.zoomReset')"
        @click="resetZoom"
      >
        {{ zoomPercent }}%
      </button>
      <Button variant="ghost" size="icon-sm" :aria-label="t('canvas.zoomIn')" @click="zoomIn">
        <Plus />
      </Button>
      <Button variant="ghost" size="icon-sm" :aria-label="t('canvas.fit')" @click="fitToView">
        <Maximize />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        :aria-label="t('canvas.shortcuts')"
        :title="t('canvas.shortcutsTitle')"
        @click="shortcutsOpen = true"
      >
        <KeyboardIcon />
      </Button>
    </div>

    <div
      class="pointer-events-none absolute bottom-4 left-4 rounded-md bg-card/80 px-2.5 py-1.5 text-[11px] text-muted-foreground shadow-sm backdrop-blur"
    >
      {{ t('canvas.hint') }}
    </div>

    <div
      v-if="shortcutsOpen"
      class="absolute inset-0 z-20 flex items-center justify-center bg-slate-900/20 p-6 backdrop-blur-[2px]"
      @pointerdown.stop
      @wheel.stop
      @click.self="closeShortcuts"
    >
      <div
        class="w-full max-w-2xl overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-2xl"
      >
        <div class="flex items-center justify-between border-b border-border px-5 py-3">
          <div>
            <h2 class="text-sm font-semibold">{{ t('canvas.shortcuts') }}</h2>
            <p class="mt-0.5 text-xs text-muted-foreground">
              {{ t('canvas.shortcutsCloseHint') }}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            :aria-label="t('app.close')"
            @click="closeShortcuts"
          >
            <X />
          </Button>
        </div>

        <div class="grid max-h-[70vh] gap-x-8 gap-y-5 overflow-auto p-5 sm:grid-cols-2">
          <section v-for="group in SHORTCUT_GROUPS" :key="group.titleKey">
            <h3 class="mb-2 text-xs font-semibold tracking-wide text-muted-foreground">
              {{ t(group.titleKey) }}
            </h3>
            <dl class="space-y-1.5">
              <div
                v-for="item in group.items"
                :key="item.keys"
                class="flex items-start justify-between gap-4 text-xs"
              >
                <dt class="text-foreground/80">{{ t(item.descriptionKey) }}</dt>
                <dd
                  class="shrink-0 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                >
                  {{ item.keys }}
                </dd>
              </div>
            </dl>
          </section>
        </div>
      </div>
    </div>
  </div>
</template>
