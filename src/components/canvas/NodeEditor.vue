<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'

const props = defineProps<{
  title: string
}>()

const emit = defineEmits<{
  commit: [title: string]
  cancel: []
}>()

const value = ref(props.title)
const textarea = ref<HTMLTextAreaElement | null>(null)
let finished = false

onMounted(async () => {
  await nextTick()
  textarea.value?.focus()
  textarea.value?.select()
})

function commit() {
  if (finished) return
  finished = true
  emit('commit', value.value)
}

function cancel() {
  if (finished) return
  finished = true
  emit('cancel')
}

function onKeydown(event: KeyboardEvent) {
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
  <textarea
    ref="textarea"
    v-model="value"
    class="h-full w-full cursor-text resize-none overflow-hidden border-0 bg-transparent p-0 outline-none select-text"
    spellcheck="false"
    data-node-editor
    @keydown="onKeydown"
    @blur="commit"
    @click.stop
    @dblclick.stop
  />
</template>

<style scoped>
textarea {
  font: inherit;
  line-height: inherit;
  color: inherit;
  text-align: inherit;
}
</style>
