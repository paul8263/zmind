<script setup lang="ts">
import { X } from '@lucide/vue'
import { computed } from 'vue'

import MarkerIcon from '@/components/markers/MarkerIcon.vue'
import { MARKER_TYPES, markerKey, markersForType } from '@/domain/markers/catalog'
import { markerLabel } from '@/domain/markers/labels'
import type { Marker, MarkerType } from '@/domain/model/types'
import { useI18n } from '@/i18n'
import { useDocumentStore } from '@/stores/document'

const docStore = useDocumentStore()
const { t } = useI18n()

const selected = computed(() => docStore.selectedNode)
const selectedMarkers = computed(() => selected.value?.markers ?? [])

function optionsFor(type: MarkerType): Marker[] {
  return markersForType(type)
}

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

      <section
        v-for="type in MARKER_TYPES"
        :key="type"
        class="space-y-2 border-b border-border pb-3 last:border-b-0 last:pb-0"
        :data-marker-section="type"
      >
        <h3 class="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
          {{ t(`markers.category.${type}`) }}
        </h3>
        <div class="grid grid-cols-7 gap-1">
          <button
            v-for="marker in optionsFor(type)"
            :key="markerKey(marker)"
            type="button"
            class="flex size-8 items-center justify-center rounded-md border transition-colors"
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
            <MarkerIcon :marker="marker" :size="20" />
          </button>
        </div>
      </section>

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
