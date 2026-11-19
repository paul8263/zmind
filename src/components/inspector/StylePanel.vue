<script setup lang="ts">
import { computed } from 'vue'

import { useLayout } from '@/composables/useLayout'
import { resolveNodeStyle } from '@/domain/layout/style'
import type { NodeShape, NodeStyle } from '@/domain/model/types'
import { useI18n } from '@/i18n'
import { useDocumentStore } from '@/stores/document'

import InspectorColorRow from './InspectorColorRow.vue'

const docStore = useDocumentStore()
const { theme, layout } = useLayout()
const { t } = useI18n()

const selected = computed(() => docStore.selectedNode)
const layoutNode = computed(() =>
  docStore.selectedNodeId ? layout.value.byId.get(docStore.selectedNodeId) : undefined,
)
const resolved = computed(() =>
  resolveNodeStyle(
    layoutNode.value?.depth ?? 0,
    layoutNode.value?.branchColor ?? theme.value.rootFill,
    selected.value?.style,
    theme.value,
  ),
)

const shapeOptions: { value: NodeShape; labelKey: string }[] = [
  { value: 'rounded', labelKey: 'style.shape.rounded' },
  { value: 'rect', labelKey: 'style.shape.rect' },
  { value: 'ellipse', labelKey: 'style.shape.ellipse' },
  { value: 'underline', labelKey: 'style.shape.underline' },
  { value: 'none', labelKey: 'style.shape.none' },
]

const COLOR_PALETTE = [
  '#ffffff',
  '#f8fafc',
  '#e2e8f0',
  '#cbd5e1',
  '#94a3b8',
  '#64748b',
  '#334155',
  '#0f172a',
  '#fecaca',
  '#f87171',
  '#ef4444',
  '#fb923c',
  '#fbbf24',
  '#facc15',
  '#a3e635',
  '#4ade80',
  '#22c55e',
  '#2dd4bf',
  '#38bdf8',
  '#60a5fa',
  '#3b82f6',
  '#818cf8',
  '#a855f7',
  '#ec4899',
]

const defaultFill = computed(() =>
  resolved.value.fill === 'transparent' ? '#ffffff' : resolved.value.fill,
)
const showRadius = computed(
  () => resolved.value.shape === 'rounded' || resolved.value.shape === 'rect',
)

function patchStyle(patch: Partial<NodeStyle>) {
  const id = docStore.selectedNodeId
  if (id) docStore.updateNodeStyle(id, patch)
}

function setShape(shape: NodeShape) {
  patchStyle({ shape })
}

function onColor(key: 'fill' | 'textColor' | 'borderColor' | 'lineColor', value: string) {
  patchStyle({ [key]: value } as Partial<NodeStyle>)
}

function clearColor(key: keyof NodeStyle) {
  patchStyle({ [key]: undefined } as Partial<NodeStyle>)
}

function onNumber(
  key: 'borderWidth' | 'borderRadius' | 'fontSize' | 'lineWidth',
  event: Event,
  min: number,
  max: number,
) {
  const raw = (event.target as HTMLInputElement).valueAsNumber
  if (Number.isNaN(raw)) return
  patchStyle({ [key]: Math.min(max, Math.max(min, Math.round(raw))) } as Partial<NodeStyle>)
}

function onFontWeight(event: Event) {
  patchStyle({ fontWeight: (event.target as HTMLSelectElement).value as 'normal' | 'bold' })
}

function onFontStyle(event: Event) {
  patchStyle({ fontStyle: (event.target as HTMLSelectElement).value as 'normal' | 'italic' })
}

function onLineStyle(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  patchStyle({ lineStyle: value === 'solid' ? undefined : (value as 'dashed' | 'dotted') })
}

function resetStyle() {
  const id = docStore.selectedNodeId
  if (id) docStore.resetNodeStyle(id)
}
</script>

<template>
  <div class="space-y-5 p-3" data-style-panel>
    <p v-if="!selected" class="py-6 text-center text-xs text-muted-foreground">
      {{ t('inspector.noSelection') }}
    </p>

    <template v-else>
      <section>
        <h3 class="mb-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
          {{ t('style.shape') }}
        </h3>
        <div class="grid grid-cols-5 gap-1">
          <button
            v-for="option in shapeOptions"
            :key="option.value"
            type="button"
            class="flex h-14 flex-col items-center justify-center gap-1 rounded-md border px-1 text-[10px] transition-colors"
            :class="
              resolved.shape === option.value
                ? 'border-sky-400 bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-200'
                : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground'
            "
            :data-shape="option.value"
            @click="setShape(option.value)"
          >
            <span
              class="block h-5 w-7 border border-current"
              :class="{
                'rounded-md': option.value === 'rounded',
                'rounded-none': option.value === 'rect',
                'rounded-full': option.value === 'ellipse',
                'rounded-none border-0 border-b-2': option.value === 'underline',
                'border-0': option.value === 'none',
              }"
            />
            {{ t(option.labelKey) }}
          </button>
        </div>
      </section>

      <section class="space-y-2">
        <h3 class="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
          {{ t('style.colors') }}
        </h3>
        <InspectorColorRow
          name="fill"
          :label="t('style.fill')"
          :value="selected.style?.fill ?? defaultFill"
          :is-default="selected.style?.fill === undefined"
          :palette="COLOR_PALETTE"
          @change="onColor('fill', $event)"
          @reset="clearColor('fill')"
        />
        <InspectorColorRow
          name="textColor"
          :label="t('style.textColor')"
          :value="selected.style?.textColor ?? resolved.textColor"
          :is-default="selected.style?.textColor === undefined"
          :palette="COLOR_PALETTE"
          @change="onColor('textColor', $event)"
          @reset="clearColor('textColor')"
        />
        <InspectorColorRow
          name="borderColor"
          :label="t('style.borderColor')"
          :value="selected.style?.borderColor ?? resolved.borderColor"
          :is-default="selected.style?.borderColor === undefined"
          :palette="COLOR_PALETTE"
          @change="onColor('borderColor', $event)"
          @reset="clearColor('borderColor')"
        />
      </section>

      <section class="grid grid-cols-2 gap-x-2 gap-y-3">
        <label class="space-y-1">
          <span class="block text-xs text-muted-foreground">{{ t('style.borderWidth') }}</span>
          <input
            type="number"
            min="0"
            max="12"
            step="0.5"
            class="h-7 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-sky-200 dark:focus:ring-sky-800"
            :value="selected.style?.borderWidth ?? resolved.borderWidth"
            @change="onNumber('borderWidth', $event, 0, 12)"
          />
        </label>
        <label v-if="showRadius" class="space-y-1">
          <span class="block text-xs text-muted-foreground">{{ t('style.borderRadius') }}</span>
          <input
            type="number"
            min="0"
            max="999"
            step="1"
            class="h-7 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-sky-200 dark:focus:ring-sky-800"
            :value="
              selected.style?.borderRadius ??
              (typeof resolved.borderRadius === 'number' ? resolved.borderRadius : 0)
            "
            @change="onNumber('borderRadius', $event, 0, 999)"
          />
        </label>
      </section>

      <section class="space-y-3">
        <h3 class="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
          {{ t('style.text') }}
        </h3>
        <div class="grid grid-cols-2 gap-2">
          <label class="space-y-1">
            <span class="block text-xs text-muted-foreground">{{ t('style.fontSize') }}</span>
            <input
              type="number"
              min="8"
              max="96"
              step="1"
              class="h-7 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-sky-200 dark:focus:ring-sky-800"
              :value="selected.style?.fontSize ?? resolved.fontSize"
              data-style-font-size
              @change="onNumber('fontSize', $event, 8, 96)"
            />
          </label>
          <label class="space-y-1">
            <span class="block text-xs text-muted-foreground">{{ t('style.fontWeight') }}</span>
            <select
              class="h-7 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-sky-200 dark:focus:ring-sky-800"
              :value="selected.style?.fontWeight ?? 'normal'"
              @change="onFontWeight"
            >
              <option value="normal">{{ t('style.normal') }}</option>
              <option value="bold">{{ t('style.bold') }}</option>
            </select>
          </label>
          <label class="space-y-1">
            <span class="block text-xs text-muted-foreground">{{ t('style.fontStyle') }}</span>
            <select
              class="h-7 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-sky-200 dark:focus:ring-sky-800"
              :value="selected.style?.fontStyle ?? 'normal'"
              @change="onFontStyle"
            >
              <option value="normal">{{ t('style.normal') }}</option>
              <option value="italic">{{ t('style.italic') }}</option>
            </select>
          </label>
          <div class="space-y-1">
            <span class="block text-xs text-muted-foreground">{{ t('style.textAlign') }}</span>
            <div class="flex h-7 overflow-hidden rounded-md border border-border">
              <button
                v-for="align in ['left', 'center', 'right'] as const"
                :key="align"
                type="button"
                class="flex-1 text-[10px] transition-colors"
                :class="
                  resolved.textAlign === align
                    ? 'bg-sky-100 text-sky-700 dark:bg-sky-500/25 dark:text-sky-100'
                    : 'text-muted-foreground hover:bg-accent'
                "
                @click="patchStyle({ textAlign: align })"
              >
                {{ t(`style.${align}`) }}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section class="space-y-2">
        <h3 class="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
          {{ t('style.line') }}
        </h3>
        <p
          v-if="resolved.shape && layoutNode?.depth === 0"
          class="rounded-md bg-muted px-2 py-1.5 text-[11px] text-muted-foreground"
        >
          {{ t('style.lineRootHint') }}
        </p>
        <template v-else>
          <InspectorColorRow
            name="lineColor"
            :label="t('style.lineColor')"
            :value="selected.style?.lineColor ?? layoutNode?.branchColor ?? theme.rootFill"
            :is-default="selected.style?.lineColor === undefined"
            :palette="COLOR_PALETTE"
            @change="onColor('lineColor', $event)"
            @reset="clearColor('lineColor')"
          />
          <div class="grid grid-cols-2 gap-2">
            <label class="space-y-1">
              <span class="block text-xs text-muted-foreground">{{ t('style.lineWidth') }}</span>
              <input
                type="number"
                min="1"
                max="12"
                step="0.5"
                class="h-7 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-sky-200 dark:focus:ring-sky-800"
                :value="selected.style?.lineWidth ?? 2"
                @change="onNumber('lineWidth', $event, 1, 12)"
              />
            </label>
            <label class="space-y-1">
              <span class="block text-xs text-muted-foreground">{{ t('style.lineStyle') }}</span>
              <select
                class="h-7 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-sky-200 dark:focus:ring-sky-800"
                :value="selected.style?.lineStyle ?? 'solid'"
                data-style-line-style
                @change="onLineStyle"
              >
                <option value="solid">{{ t('style.solid') }}</option>
                <option value="dashed">{{ t('style.dashed') }}</option>
                <option value="dotted">{{ t('style.dotted') }}</option>
              </select>
            </label>
          </div>
        </template>
      </section>

      <button
        type="button"
        class="w-full rounded-md border border-border py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
        :disabled="!selected.style"
        data-style-reset
        @click="resetStyle"
      >
        {{ t('style.reset') }}
      </button>
    </template>
  </div>
</template>
