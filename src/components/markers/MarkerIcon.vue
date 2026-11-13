<script setup lang="ts">
import { computed } from 'vue'

import { markerVisual } from '@/domain/markers/catalog'
import { markerLabel } from '@/domain/markers/labels'
import type { Marker } from '@/domain/model/types'
import { useI18n } from '@/i18n'

const props = withDefaults(
  defineProps<{
    marker: Marker
    size?: number
  }>(),
  { size: 16 },
)

const { t } = useI18n()
const visual = computed(() => markerVisual(props.marker))
const label = computed(() => markerLabel(props.marker, t))
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 16 16"
    role="img"
    class="shrink-0"
    :aria-label="label"
    :data-marker-icon="marker.type"
  >
    <title>{{ label }}</title>

    <template v-if="visual.kind === 'solid'">
      <circle
        cx="8"
        cy="8"
        r="7.4"
        :fill="visual.background"
        stroke="#ffffff"
        stroke-opacity="0.35"
        stroke-width="1"
      />
    </template>

    <template v-else-if="visual.kind === 'progress'">
      <circle cx="8" cy="8" r="7.2" fill="#F0FDF4" stroke="#86EFAC" stroke-width="1" />
      <circle v-if="visual.pieFull" cx="8" cy="8" r="6.2" fill="#22C55E" />
      <path v-else-if="visual.piePath" :d="visual.piePath" fill="#22C55E" />
    </template>

    <template v-else>
      <circle cx="8" cy="8" r="7.4" :fill="visual.background" />
      <template v-for="(primitive, index) in visual.glyphs" :key="index">
        <path
          v-if="primitive.kind === 'path'"
          :d="primitive.d"
          :fill="primitive.fill ?? 'none'"
          :stroke="primitive.stroke ?? 'none'"
          :stroke-width="primitive.strokeWidth ?? 1.6"
          stroke-linecap="round"
          stroke-linejoin="round"
          :transform="primitive.transform"
        />
        <circle
          v-else-if="primitive.kind === 'circle'"
          :cx="primitive.cx"
          :cy="primitive.cy"
          :r="primitive.r"
          :fill="primitive.fill ?? 'none'"
        />
        <text
          v-else
          x="8"
          y="8.7"
          text-anchor="middle"
          dominant-baseline="middle"
          :font-size="primitive.size"
          font-weight="700"
          fill="#ffffff"
        >
          {{ primitive.text }}
        </text>
      </template>
    </template>
  </svg>
</template>
