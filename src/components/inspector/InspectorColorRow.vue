<script setup lang="ts">
import { RotateCcw } from '@lucide/vue'

import { useI18n } from '@/i18n'

const props = defineProps<{
  label: string
  value: string
  isDefault: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  change: [value: string]
  reset: []
}>()

const { t } = useI18n()

function onChange(event: Event) {
  emit('change', (event.target as HTMLInputElement).value)
}
</script>

<template>
  <div class="flex items-center justify-between gap-2">
    <span class="text-xs text-muted-foreground">{{ label }}</span>
    <div class="flex items-center gap-1">
      <input
        type="color"
        class="size-6 shrink-0 cursor-pointer rounded border border-border bg-transparent p-0"
        :value="props.value"
        :disabled="disabled"
        :aria-label="label"
        @change="onChange"
      />
      <button
        type="button"
        class="flex size-6 shrink-0 items-center justify-center rounded border border-transparent text-muted-foreground hover:border-border hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
        :title="t('style.useDefault')"
        :aria-label="t('style.useDefault')"
        :disabled="isDefault || disabled"
        @click="emit('reset')"
      >
        <RotateCcw class="size-3" />
      </button>
    </div>
  </div>
</template>
