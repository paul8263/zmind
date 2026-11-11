<script setup lang="ts">
import { X } from '@lucide/vue'

import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n'
import { useDocumentStore } from '@/stores/document'
import { useUiStore } from '@/stores/ui'

import OutlineNode from './OutlineNode.vue'

const docStore = useDocumentStore()
const uiStore = useUiStore()
const { t } = useI18n()
</script>

<template>
  <aside
    class="flex h-full w-64 shrink-0 flex-col border-r border-border bg-card text-card-foreground"
    data-outline-panel
  >
    <div class="flex h-9 shrink-0 items-center justify-between border-b border-border px-3">
      <h2 class="text-xs font-semibold tracking-wide text-muted-foreground">
        {{ t('outline.title') }}
      </h2>
      <Button
        variant="ghost"
        size="icon-sm"
        :aria-label="t('inspector.close')"
        :title="t('app.outline')"
        @click="uiStore.toggleOutline()"
      >
        <X />
      </Button>
    </div>

    <div class="min-h-0 flex-1 overflow-auto p-2">
      <p v-if="!docStore.doc.root" class="px-2 py-4 text-xs text-muted-foreground">
        {{ t('outline.empty') }}
      </p>
      <OutlineNode v-else :node="docStore.doc.root" :depth="0" />
    </div>
  </aside>
</template>
