<script setup lang="ts">
import { Minus, Plus } from '@lucide/vue'
import { computed, type CSSProperties } from 'vue'

import type { LayoutNode } from '@/domain/layout/logical'
import { resolveNodeStyle } from '@/domain/layout/style'
import type { MindMapTheme } from '@/domain/theme'
import { useI18n } from '@/i18n'

import NodeEditor from './NodeEditor.vue'

const props = defineProps<{
  node: LayoutNode
  selected: boolean
  editing: boolean
  dragging?: boolean
  theme: MindMapTheme
}>()

const emit = defineEmits<{
  select: [id: string]
  edit: [id: string]
  toggle: [id: string]
  dragstart: [id: string, event: PointerEvent]
  commit: [id: string, title: string]
  cancel: []
}>()

const { t } = useI18n()

const hasChildren = computed(() => props.node.node.children.length > 0)
const isCollapsed = computed(() => props.node.node.collapsed)

const resolved = computed(() =>
  resolveNodeStyle(props.node.depth, props.node.branchColor, props.node.node.style, props.theme),
)

const nodeStyle = computed<CSSProperties>(() => {
  const style = resolved.value
  const shadows: string[] = []
  const hasBorder = style.shape === 'rounded' || style.shape === 'rect' || style.shape === 'ellipse'

  if (props.selected) {
    shadows.push(`0 0 0 2px ${props.theme.canvasBg}`, '0 0 0 4px #38bdf8')
  } else if (hasBorder) {
    shadows.push('0 1px 2px rgba(15, 23, 42, 0.08)')
  }

  const result: CSSProperties = {
    left: `${props.node.x}px`,
    top: `${props.node.y}px`,
    width: `${props.node.width}px`,
    height: `${props.node.height}px`,
    padding: `${style.paddingY}px ${style.paddingX}px`,
    borderRadius:
      typeof style.borderRadius === 'number' ? `${style.borderRadius}px` : style.borderRadius,
    fontSize: `${style.fontSize}px`,
    fontWeight: style.fontWeight,
    fontStyle: style.fontStyle,
    fontFamily: style.fontFamily,
    lineHeight: style.lineHeight,
    background: style.fill,
    color: style.textColor,
    border: hasBorder ? `${style.borderWidth}px solid ${style.borderColor}` : 'none',
    boxShadow: shadows.join(', '),
    textAlign: style.textAlign,
    justifyContent:
      style.textAlign === 'left'
        ? 'flex-start'
        : style.textAlign === 'right'
          ? 'flex-end'
          : 'center',
  }

  if (style.shape === 'underline') {
    result.borderBottom = `${Math.max(style.borderWidth, 2)}px solid ${style.borderColor}`
  }

  return result
})

function handleCommit(title: string) {
  emit('commit', props.node.id, title)
}

function handleCancel() {
  emit('cancel')
}

function handlePointerDown(event: PointerEvent) {
  if (props.editing || event.button !== 0) return

  emit('select', props.node.id)
  emit('dragstart', props.node.id, event)
}
</script>

<template>
  <div
    class="absolute flex cursor-grab items-center transition-shadow select-none active:cursor-grabbing"
    :class="{ 'opacity-30': dragging }"
    :style="nodeStyle"
    :data-node-id="node.id"
    :data-depth="node.depth"
    @pointerdown.stop="handlePointerDown"
    @dblclick.stop="emit('edit', node.id)"
  >
    <NodeEditor
      v-if="editing"
      :title="node.node.title"
      @commit="handleCommit"
      @cancel="handleCancel"
    />
    <span
      v-else
      class="w-full break-words whitespace-pre-wrap"
      :class="{ 'opacity-50': !node.node.title }"
    >
      {{ node.node.title || t('topic.untitled') }}
    </span>

    <button
      v-if="hasChildren"
      type="button"
      class="absolute top-1/2 -right-2.5 flex size-[18px] -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm hover:bg-accent"
      :title="isCollapsed ? t('topic.expand') : t('topic.collapse')"
      @pointerdown.prevent.stop
      @click.stop="emit('toggle', node.id)"
    >
      <Plus v-if="isCollapsed" class="size-3" />
      <Minus v-else class="size-3" />
    </button>
  </div>
</template>
