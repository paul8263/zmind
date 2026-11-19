<script setup lang="ts">
import { ChevronDown, RotateCcw } from '@lucide/vue'
import { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui'
import { computed, onBeforeUnmount, ref, watch } from 'vue'

import { useI18n } from '@/i18n'
import { closeTransientOverlay, openTransientOverlay } from '@/lib/transientOverlay'

const props = defineProps<{
  label: string
  value: string
  isDefault: boolean
  disabled?: boolean
  name?: string
  palette?: readonly string[]
}>()

const emit = defineEmits<{
  change: [value: string]
  reset: []
}>()

const { t } = useI18n()
const open = ref(false)
const customOpen = ref(false)
const draft = ref('#000000')

const channels = computed(() => ({
  r: Number.parseInt(draft.value.slice(1, 3), 16),
  g: Number.parseInt(draft.value.slice(3, 5), 16),
  b: Number.parseInt(draft.value.slice(5, 7), 16),
}))

let overlayToken: symbol | null = null

watch(open, (isOpen) => {
  if (isOpen) {
    overlayToken = openTransientOverlay()
    draft.value = normalizeHex(props.value)
    customOpen.value = false
    return
  }

  closeTransientOverlay(overlayToken)
  overlayToken = null
})

onBeforeUnmount(() => closeTransientOverlay(overlayToken))

function normalizeHex(value: string): string {
  const match = /^#?([0-9a-f]{6})$/i.exec(value.trim())
  return match ? `#${match[1].toLowerCase()}` : '#000000'
}

function toHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
}

function pick(color: string) {
  emit('change', color)
  open.value = false
}

function onChannelInput(channel: 'r' | 'g' | 'b', event: Event) {
  const value = (event.target as HTMLInputElement).valueAsNumber
  if (Number.isNaN(value)) return
  const next = { ...channels.value, [channel]: Math.min(255, Math.max(0, Math.round(value))) }
  draft.value = toHex(next.r, next.g, next.b)
}

function onChannelCommit() {
  emit('change', draft.value)
}

function onHexInput(event: Event) {
  const raw = (event.target as HTMLInputElement).value.trim()
  if (/^#?[0-9a-f]{6}$/i.test(raw)) draft.value = normalizeHex(raw)
}

function onHexCommit(event: Event) {
  const input = event.target as HTMLInputElement
  draft.value = normalizeHex(input.value)
  input.value = draft.value
  emit('change', draft.value)
}

function isActive(color: string): boolean {
  return props.value.toLowerCase() === color.toLowerCase()
}
</script>

<template>
  <div class="flex items-center justify-between gap-2" :data-color-row="props.name">
    <span class="text-xs text-muted-foreground">{{ label }}</span>
    <div class="flex items-center gap-1">
      <PopoverRoot v-model:open="open">
        <PopoverTrigger as-child>
          <button
            type="button"
            class="size-6 shrink-0 cursor-pointer rounded border border-border disabled:pointer-events-none disabled:opacity-40"
            :style="{ backgroundColor: props.value }"
            :title="label"
            :aria-label="label"
            :disabled="disabled"
            :data-color-trigger="props.name"
          />
        </PopoverTrigger>
        <PopoverPortal>
          <PopoverContent
            side="left"
            align="center"
            :side-offset="6"
            class="z-50 w-64 rounded-lg border border-border bg-card p-2 text-card-foreground shadow-xl outline-none"
            :data-color-popover="props.name"
            @open-auto-focus.prevent
          >
            <div
              v-if="palette?.length"
              class="grid grid-cols-8 gap-1"
              role="group"
              :aria-label="t('style.commonColors')"
            >
              <button
                v-for="color in palette"
                :key="color"
                type="button"
                class="size-5 rounded border transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none"
                :class="isActive(color) ? 'border-sky-500 ring-2 ring-sky-400' : 'border-border'"
                :style="{ backgroundColor: color }"
                :title="color"
                :aria-label="color"
                :data-color-swatch="color"
                @click="pick(color)"
              />
            </div>

            <div class="mt-2 border-t border-border pt-1.5">
              <button
                type="button"
                class="flex w-full items-center justify-between rounded px-0.5 py-1 text-xs text-muted-foreground hover:text-foreground"
                :aria-expanded="customOpen"
                data-color-custom-toggle
                @click="customOpen = !customOpen"
              >
                {{ t('style.customColor') }}
                <ChevronDown
                  class="size-3 transition-transform"
                  :class="{ 'rotate-180': customOpen }"
                />
              </button>

              <div v-if="customOpen" class="space-y-2 pt-1.5" data-color-custom-panel>
                <div class="flex items-center gap-1.5">
                  <span
                    class="size-6 shrink-0 rounded border border-border"
                    :style="{ backgroundColor: draft }"
                    data-color-custom-preview
                  />
                  <input
                    type="text"
                    class="h-7 min-w-0 flex-1 rounded-md border border-border bg-background px-2 font-mono text-xs text-foreground uppercase outline-none focus:ring-2 focus:ring-sky-200 dark:focus:ring-sky-800"
                    :value="draft"
                    maxlength="7"
                    spellcheck="false"
                    :aria-label="t('style.customColor')"
                    data-color-hex
                    @input="onHexInput"
                    @change="onHexCommit"
                  />
                </div>

                <label
                  v-for="channel in ['r', 'g', 'b'] as const"
                  :key="channel"
                  class="flex items-center gap-2"
                >
                  <span class="w-2.5 text-[10px] font-semibold text-muted-foreground uppercase">
                    {{ channel }}
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="255"
                    step="1"
                    class="h-1 min-w-0 flex-1 cursor-pointer accent-sky-500"
                    :value="channels[channel]"
                    :aria-label="channel.toUpperCase()"
                    :data-color-channel="channel"
                    @input="onChannelInput(channel, $event)"
                    @change="onChannelCommit"
                  />
                  <span class="w-6 text-right text-[10px] text-muted-foreground tabular-nums">
                    {{ channels[channel] }}
                  </span>
                </label>
              </div>
            </div>
          </PopoverContent>
        </PopoverPortal>
      </PopoverRoot>
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
