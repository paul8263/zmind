<script setup lang="ts">
import { Plus, Trash2 } from '@lucide/vue'
import { computed, reactive, ref } from 'vue'

import { useLayout } from '@/composables/useLayout'
import {
  createCustomThemeId,
  DEFAULT_THEME_ID,
  type MindMapTheme,
  type ThemeMode,
} from '@/domain/theme'
import { useI18n } from '@/i18n'
import { useDocumentStore } from '@/stores/document'
import { useThemeStore } from '@/stores/theme'

const docStore = useDocumentStore()
const themeStore = useThemeStore()
const { theme } = useLayout()
const { t, locale } = useI18n()

const creating = ref(false)
const draftName = ref('')
const draft = reactive({
  mode: 'light' as ThemeMode,
  canvasBg: '#f7f8fa',
  rootFill: '#1f2937',
  rootText: '#ffffff',
  branchText: '#ffffff',
  nodeFill: '#ffffff',
  nodeText: '#1f2937',
  palette: ['#e8590c', '#1c7ed6', '#0ca678', '#ae3ec9', '#f59f00', '#e03131'],
})

const builtinThemes = computed(() => themeStore.allThemes.filter((item) => item.builtin))
const customThemes = computed(() => themeStore.allThemes.filter((item) => !item.builtin))

function themeName(item: MindMapTheme) {
  return locale.value === 'en' ? item.name.en : item.name.zh
}

function selectTheme(item: MindMapTheme) {
  docStore.setTheme(item.id)
}

function startCreate() {
  const base = theme.value
  draftName.value = ''
  draft.mode = base.mode
  draft.canvasBg = base.canvasBg
  draft.rootFill = base.rootFill
  draft.rootText = base.rootText
  draft.branchText = base.branchText
  draft.nodeFill = base.nodeFill
  draft.nodeText = base.nodeText
  draft.palette = [...base.branchPalette].slice(0, 6)
  creating.value = true
}

function onDraftColor(
  key: 'canvasBg' | 'rootFill' | 'rootText' | 'branchText' | 'nodeFill' | 'nodeText',
  event: Event,
) {
  draft[key] = (event.target as HTMLInputElement).value
}

function onPaletteColor(index: number, event: Event) {
  draft.palette[index] = (event.target as HTMLInputElement).value
}

function saveCustom() {
  const name = draftName.value.trim()
  if (!name) return

  const custom: MindMapTheme = {
    id: createCustomThemeId(),
    name: { zh: name, en: name },
    mode: draft.mode,
    canvasBg: draft.canvasBg,
    rootFill: draft.rootFill,
    rootText: draft.rootText,
    branchText: draft.branchText,
    nodeFill: draft.nodeFill,
    nodeText: draft.nodeText,
    branchPalette: [...draft.palette],
    builtin: false,
  }

  themeStore.addCustom(custom)
  docStore.setTheme(custom.id)
  creating.value = false
}

function removeCustom(item: MindMapTheme) {
  if (!window.confirm(t('theme.deleteConfirm'))) return
  themeStore.removeCustom(item.id)
  if (docStore.doc.themeId === item.id) docStore.setTheme(DEFAULT_THEME_ID)
}
</script>

<template>
  <div class="space-y-4 p-3" data-theme-panel>
    <section>
      <h3 class="mb-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
        {{ t('theme.builtin') }}
      </h3>
      <div class="grid grid-cols-2 gap-2">
        <button
          v-for="item in builtinThemes"
          :key="item.id"
          type="button"
          class="relative overflow-hidden rounded-lg border p-1.5 text-left transition-colors"
          :class="
            docStore.doc.themeId === item.id
              ? 'border-sky-400 ring-1 ring-sky-300'
              : 'border-border hover:border-sky-300'
          "
          :data-theme-id="item.id"
          @click="selectTheme(item)"
        >
          <div
            class="flex h-14 flex-col items-center justify-center gap-1 rounded-md"
            :style="{ backgroundColor: item.canvasBg }"
          >
            <span
              class="rounded-full px-2 py-0.5 text-[8px] font-semibold"
              :style="{ backgroundColor: item.rootFill, color: item.rootText }"
            >
              {{ themeName(item) }}
            </span>
            <span class="flex gap-1">
              <span
                v-for="(color, index) in item.branchPalette.slice(0, 4)"
                :key="index"
                class="h-1 w-4 rounded-full"
                :style="{ backgroundColor: color }"
              />
            </span>
          </div>
          <div class="flex items-center justify-between px-1 pt-1">
            <span class="truncate text-[10px]">{{ themeName(item) }}</span>
            <span
              v-if="docStore.doc.themeId === item.id"
              class="shrink-0 text-[9px] text-sky-600 dark:text-sky-300"
            >
              {{ t('theme.current') }}
            </span>
          </div>
        </button>
      </div>
    </section>

    <section v-if="customThemes.length > 0">
      <h3 class="mb-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
        {{ t('theme.custom') }}
      </h3>
      <div class="grid grid-cols-2 gap-2">
        <div
          v-for="item in customThemes"
          :key="item.id"
          class="group relative overflow-hidden rounded-lg border"
          :class="
            docStore.doc.themeId === item.id
              ? 'border-sky-400 ring-1 ring-sky-300'
              : 'border-border'
          "
          :data-theme-id="item.id"
        >
          <button type="button" class="w-full p-1.5 text-left" @click="selectTheme(item)">
            <div
              class="flex h-14 flex-col items-center justify-center gap-1 rounded-md"
              :style="{ backgroundColor: item.canvasBg }"
            >
              <span
                class="rounded-full px-2 py-0.5 text-[8px] font-semibold"
                :style="{ backgroundColor: item.rootFill, color: item.rootText }"
              >
                {{ themeName(item) }}
              </span>
              <span class="flex gap-1">
                <span
                  v-for="(color, index) in item.branchPalette.slice(0, 4)"
                  :key="index"
                  class="h-1 w-4 rounded-full"
                  :style="{ backgroundColor: color }"
                />
              </span>
            </div>
            <div class="flex items-center justify-between gap-1 px-1 pt-1">
              <span class="truncate text-[10px]">{{ themeName(item) }}</span>
              <span class="shrink-0 text-[9px] text-muted-foreground">
                {{ t('theme.customBadge') }}
              </span>
            </div>
          </button>
          <button
            type="button"
            class="absolute top-1 right-1 flex size-5 items-center justify-center rounded bg-card/80 text-muted-foreground opacity-0 shadow-sm transition-opacity group-hover:opacity-100 hover:text-red-500"
            :title="t('theme.delete')"
            :aria-label="t('theme.delete')"
            @click.stop="removeCustom(item)"
          >
            <Trash2 class="size-3" />
          </button>
        </div>
      </div>
    </section>

    <button
      v-if="!creating"
      type="button"
      class="flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-border py-2 text-xs text-muted-foreground transition-colors hover:border-sky-300 hover:text-foreground"
      data-theme-new
      @click="startCreate"
    >
      <Plus class="size-3.5" />
      {{ t('theme.newCustom') }}
    </button>

    <form
      v-else
      class="space-y-3 rounded-lg border border-border p-2.5"
      @submit.prevent="saveCustom"
    >
      <label class="block space-y-1">
        <span class="block text-xs text-muted-foreground">{{ t('theme.name') }}</span>
        <input
          v-model="draftName"
          type="text"
          class="h-7 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-sky-200 dark:focus:ring-sky-800"
          :placeholder="t('theme.namePlaceholder')"
          data-theme-name-input
        />
      </label>

      <label class="block space-y-1">
        <span class="block text-xs text-muted-foreground">{{ t('theme.mode') }}</span>
        <select
          v-model="draft.mode"
          class="h-7 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-sky-200 dark:focus:ring-sky-800"
        >
          <option value="light">{{ t('theme.mode.light') }}</option>
          <option value="dark">{{ t('theme.mode.dark') }}</option>
        </select>
      </label>

      <div class="space-y-2">
        <h4 class="text-[11px] font-semibold text-muted-foreground">
          {{ t('theme.colors.palette') }}
        </h4>
        <div class="grid grid-cols-6 gap-1">
          <input
            v-for="(color, index) in draft.palette"
            :key="index"
            type="color"
            class="h-7 w-full cursor-pointer rounded border border-border bg-transparent p-0"
            :value="color"
            :aria-label="`${t('theme.colors.palette')} ${index + 1}`"
            @change="onPaletteColor(index, $event)"
          />
        </div>
      </div>

      <div class="space-y-2">
        <label class="flex items-center justify-between gap-2">
          <span class="text-xs text-muted-foreground">{{ t('theme.colors.canvas') }}</span>
          <input
            type="color"
            class="size-6 cursor-pointer rounded border border-border bg-transparent p-0"
            :value="draft.canvasBg"
            @change="onDraftColor('canvasBg', $event)"
          />
        </label>
        <label class="flex items-center justify-between gap-2">
          <span class="text-xs text-muted-foreground">{{ t('theme.colors.rootFill') }}</span>
          <input
            type="color"
            class="size-6 cursor-pointer rounded border border-border bg-transparent p-0"
            :value="draft.rootFill"
            @change="onDraftColor('rootFill', $event)"
          />
        </label>
        <label class="flex items-center justify-between gap-2">
          <span class="text-xs text-muted-foreground">{{ t('theme.colors.rootText') }}</span>
          <input
            type="color"
            class="size-6 cursor-pointer rounded border border-border bg-transparent p-0"
            :value="draft.rootText"
            @change="onDraftColor('rootText', $event)"
          />
        </label>
        <label class="flex items-center justify-between gap-2">
          <span class="text-xs text-muted-foreground">{{ t('theme.colors.branchText') }}</span>
          <input
            type="color"
            class="size-6 cursor-pointer rounded border border-border bg-transparent p-0"
            :value="draft.branchText"
            @change="onDraftColor('branchText', $event)"
          />
        </label>
        <label class="flex items-center justify-between gap-2">
          <span class="text-xs text-muted-foreground">{{ t('theme.colors.nodeFill') }}</span>
          <input
            type="color"
            class="size-6 cursor-pointer rounded border border-border bg-transparent p-0"
            :value="draft.nodeFill"
            @change="onDraftColor('nodeFill', $event)"
          />
        </label>
        <label class="flex items-center justify-between gap-2">
          <span class="text-xs text-muted-foreground">{{ t('theme.colors.nodeText') }}</span>
          <input
            type="color"
            class="size-6 cursor-pointer rounded border border-border bg-transparent p-0"
            :value="draft.nodeText"
            @change="onDraftColor('nodeText', $event)"
          />
        </label>
      </div>

      <div class="flex gap-2">
        <button
          type="submit"
          class="flex-1 rounded-md bg-sky-600 py-1.5 text-xs font-medium text-white transition-colors hover:bg-sky-700 disabled:pointer-events-none disabled:opacity-40"
          :disabled="!draftName.trim()"
          data-theme-save
        >
          {{ t('theme.save') }}
        </button>
        <button
          type="button"
          class="flex-1 rounded-md border border-border py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          @click="creating = false"
        >
          {{ t('theme.cancel') }}
        </button>
      </div>
    </form>
  </div>
</template>
