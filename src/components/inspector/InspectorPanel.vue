<script setup lang="ts">
import { X } from '@lucide/vue'

import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n'
import { useDocumentStore } from '@/stores/document'
import { useUiStore } from '@/stores/ui'

import MarkerPanel from './MarkerPanel.vue'
import StylePanel from './StylePanel.vue'
import ThemePanel from './ThemePanel.vue'

const docStore = useDocumentStore()
const uiStore = useUiStore()
const { t } = useI18n()

const tabs = [
  { value: 'style', labelKey: 'inspector.style' },
  { value: 'theme', labelKey: 'inspector.theme' },
  { value: 'markers', labelKey: 'inspector.markers' },
] as const
</script>

<template>
  <aside
    class="flex h-full w-72 shrink-0 flex-col border-l border-border bg-card text-card-foreground"
    data-inspector-panel
  >
    <div class="flex h-9 shrink-0 items-center justify-between border-b border-border px-3">
      <h2 class="text-xs font-semibold tracking-wide text-muted-foreground">
        {{ t('inspector.title') }}
      </h2>
      <Button
        variant="ghost"
        size="icon-sm"
        :aria-label="t('inspector.close')"
        :title="t('app.inspector')"
        @click="uiStore.toggleInspector()"
      >
        <X />
      </Button>
    </div>

    <div class="flex shrink-0 gap-1 border-b border-border px-2 pt-2">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        type="button"
        class="flex-1 border-b-2 px-2 py-1.5 text-xs transition-colors"
        :class="
          uiStore.inspectorTab === tab.value
            ? 'border-sky-500 font-medium text-foreground'
            : 'border-transparent text-muted-foreground hover:text-foreground'
        "
        :data-inspector-tab="tab.value"
        @click="uiStore.setInspectorTab(tab.value)"
      >
        {{ t(tab.labelKey) }}
      </button>
    </div>

    <div
      v-if="uiStore.inspectorTab !== 'theme' && docStore.selectedNode"
      class="shrink-0 truncate border-b border-border px-3 py-1.5 text-[11px] text-muted-foreground"
    >
      {{ docStore.selectedNode.title || t('topic.untitled') }}
    </div>

    <div class="min-h-0 flex-1 overflow-auto">
      <StylePanel v-if="uiStore.inspectorTab === 'style'" />
      <MarkerPanel v-else-if="uiStore.inspectorTab === 'markers'" />
      <ThemePanel v-else />
    </div>
  </aside>
</template>
