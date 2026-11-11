<script setup lang="ts">
import type { Connection, Rect } from '@/domain/layout/logical'

defineProps<{
  connections: Connection[]
  bounds: Rect
}>()
</script>

<template>
  <svg
    class="pointer-events-none absolute top-0 left-0 overflow-visible"
    :width="bounds.width"
    :height="bounds.height"
    aria-hidden="true"
  >
    <path
      v-for="connection in connections"
      :key="connection.id"
      :d="connection.path"
      fill="none"
      :stroke="connection.color"
      :stroke-width="connection.width"
      :stroke-dasharray="connection.dasharray"
      stroke-linecap="round"
    />
  </svg>
</template>
