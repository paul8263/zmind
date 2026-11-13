<script setup lang="ts">
import { X } from '@lucide/vue'
import { computed, ref } from 'vue'

import MarkerIcon from '@/components/markers/MarkerIcon.vue'
import {
  MARKER_COLORS,
  MARKER_TYPES,
  markerKey,
  markersForCategory,
} from '@/domain/markers/catalog'
import { markerLabel } from '@/domain/markers/labels'
import type { Marker, MarkerColor, MarkerType } from '@/domain/model/types'
import { useI18n } from '@/i18n'
import { useDocumentStore } from '@/stores/document'

const docStore = useDocumentStore()
const { t } = useI18n()

const activeType = ref<MarkerType>('solid')
const activeColor = ref<MarkerColor>('red')

const selected = computed(() => docStore.selectedNode)
const selectedMarkers = computed(() => selected.value?.markers ?? [])
const options = computed(() => markersForCategory(activeType.value, activeColor.value))
const showColors = computed(() => activeType.value !== 'progress')

function isActive(marker: Marker): boolean {
  const key = markerKey(marker)
  return selectedMarkers.value.some((item) => markerKey(item) === key)
}

function toggle(marker: Marker) {
  const node = selected.value
  if (node) docStore.toggleMarker(node.id, marker)
}

function remove(type: MarkerType) {
  const node = selected.value
  if (node) docStore.removeMarker(node.id, type)
}

function clear() {
  const node = selected.value
  if (node) docStore.clearMarkers(node.id)
}

function label(marker: Marker): string {
  return markerLabel(marker, t)
}
</script>

<template>
  <div class="space-y-4 p-3" data-marker-panel>
    <p v-if="!selected" class="py-6 text-center text-xs text-muted-foreground">
      {{ t('markers.noSelection') }}
    </p>

    <template v-else>
      <div class="flex items-center justify-between gap-2">
        <p class="min-w-0 truncate text-xs font-medium">
          {{ selected.title || t('topic.untitled') }}
        </p>
        <span class="shrink-0 text-[10px] text-muted-foreground">
          {{ selectedMarkers.length }}
        </span>
      </div>

      <div class="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1" data-marker-categories>
        <button
          v-for="type in MARKER_TYPES"
          :key="type"
          type="button"
          class="shrink-0 rounded-md border px-2 py-1 text-[11px] transition-colors"
          :class="
            activeType === type
              ? 'border-sky-400 bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-200'
              : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground'
          "
          :data-marker-category="type"
          @click="activeType = type"
        >
          {{ t(`markers.category.${type}`) }}
        </button>
      </div>

      <div v-if="showColors" class="flex items-center justify-between gap-1" data-marker-colors>
        <button
          v-for="color in MARKER_COLORS"
          :key="color.value"
          type="button"
          class="size-5 rounded-full border border-black/10 transition-transform hover:scale-110"
          :class="{
            'ring-2 ring-sky-400 ring-offset-2 ring-offset-card': activeColor === color.value,
          }"
          :style="{ backgroundColor: color.hex }"
          :title="t(color.labelKey)"
          :aria-label="t(color.labelKey)"
          :data-marker-color="color.value"
          @click="activeColor = color.value"
        />
      </div>

      <div class="grid grid-cols-6 gap-1.5" data-marker-options>
        <button
          v-for="marker in options"
          :key="markerKey(marker)"
          type="button"
          class="flex size-9 items-center justify-center rounded-md border transition-colors"
          :class="
            isActive(marker)
              ? 'border-sky-400 bg-sky-50 dark:bg-sky-500/20'
              : 'border-transparent hover:bg-accent'
          "
          :title="label(marker)"
          :aria-label="label(marker)"
          :aria-pressed="isActive(marker)"
          :data-marker-option="markerKey(marker)"
          @click="toggle(marker)"
        >
          <MarkerIcon :marker="marker" :size="24" />
        </button>
      </div>

      <section v-if="selectedMarkers.length > 0" class="space-y-2" data-marker-selected>
        <h3 class="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
          {{ t('markers.selected') }}
        </h3>
        <div class="space-y-1">
          <div
            v-for="marker in selectedMarkers"
            :key="markerKey(marker)"
            class="flex items-center justify-between gap-2 rounded-md border border-border px-2 py-1"
          >
            <span class="flex min-w-0 items-center gap-2 text-xs">
              <MarkerIcon :marker="marker" :size="16" />
              <span class="truncate">{{ label(marker) }}</span>
            </span>
            <button
              type="button"
              class="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
              :title="t('markers.remove')"
              :aria-label="t('markers.remove')"
              :data-marker-remove="marker.type"
              @click="remove(marker.type)"
            >
              <X class="size-3" />
            </button>
          </div>
        </div>
        <button
          type="button"
          class="w-full rounded-md border border-border py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          data-marker-clear
          @click="clear"
        >
          {{ t('markers.clear') }}
        </button>
      </section>

      <p v-else class="text-[11px] text-muted-foreground">{{ t('markers.empty') }}</p>
    </template>
  </div>
</template>
