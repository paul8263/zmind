<script setup lang="ts">
import { ChevronDown, ChevronRight } from '@lucide/vue'
import { computed, nextTick, ref, watch } from 'vue'

import type { TopicNode } from '@/domain/model/types'
import { useI18n } from '@/i18n'
import { useDocumentStore } from '@/stores/document'

const props = defineProps<{
  node: TopicNode
  depth: number
}>()

const docStore = useDocumentStore()
const { t } = useI18n()

const hasChildren = computed(() => props.node.children.length > 0)
const isCollapsed = computed(() => props.node.collapsed)
const isEditing = computed(
  () => docStore.editingNodeId === props.node.id && docStore.editingSource === 'outline',
)

const editorValue = ref('')
const editorRef = ref<HTMLTextAreaElement | null>(null)
let finished = false

watch(
  isEditing,
  async (editing) => {
    if (!editing) return

    editorValue.value = props.node.title
    finished = false
    await nextTick()
    resizeEditor()
    editorRef.value?.focus()
    editorRef.value?.select()
  },
  { immediate: true },
)

function resizeEditor() {
  const element = editorRef.value
  if (!element) return

  element.style.height = 'auto'
  element.style.height = `${element.scrollHeight}px`
}

function select() {
  docStore.select(props.node.id)
}

function edit() {
  docStore.startEditing(props.node.id, 'outline')
}

function toggle(event: MouseEvent) {
  event.stopPropagation()
  docStore.toggle(props.node.id)
}

function commit() {
  if (finished || !isEditing.value) return
  finished = true
  docStore.rename(props.node.id, editorValue.value)
}

function cancel() {
  if (finished) return
  finished = true
  docStore.stopEditing()
}

function onEditorKeydown(event: KeyboardEvent) {
  event.stopPropagation()

  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    commit()
  } else if (event.key === 'Escape') {
    event.preventDefault()
    cancel()
  }
}
</script>

<template>
  <div>
    <div
      class="flex cursor-default items-center gap-1 rounded-md py-1 pr-2 text-xs select-none"
      :class="
        docStore.selectedNodeId === node.id
          ? 'bg-sky-100 text-sky-900 dark:bg-sky-500/25 dark:text-sky-50'
          : 'hover:bg-accent'
      "
      :style="{ paddingLeft: `${depth * 14 + 6}px` }"
      :data-outline-node="node.id"
      @click="select"
      @dblclick="edit"
    >
      <button
        v-if="hasChildren"
        type="button"
        class="flex size-4 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
        :title="isCollapsed ? t('topic.expand') : t('topic.collapse')"
        @click="toggle"
      >
        <ChevronRight v-if="isCollapsed" class="size-3.5" />
        <ChevronDown v-else class="size-3.5" />
      </button>
      <span v-else class="size-4 shrink-0" />

      <textarea
        v-if="isEditing"
        ref="editorRef"
        v-model="editorValue"
        rows="1"
        class="min-w-0 flex-1 resize-none overflow-hidden rounded-sm border-0 bg-transparent p-0 text-xs leading-4 outline-none select-text"
        spellcheck="false"
        data-outline-editor
        @input="resizeEditor"
        @keydown="onEditorKeydown"
        @blur="commit"
        @click.stop
        @dblclick.stop
      />
      <span v-else class="truncate" :class="{ 'text-muted-foreground': !node.title }">
        {{ node.title || t('topic.untitled') }}
      </span>
    </div>

    <OutlineNode
      v-for="child in isCollapsed ? [] : node.children"
      :key="child.id"
      :node="child"
      :depth="depth + 1"
    />
  </div>
</template>

<style scoped>
textarea {
  font: inherit;
  line-height: inherit;
  color: inherit;
}
</style>
