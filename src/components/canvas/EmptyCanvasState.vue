<script setup lang="ts">
import { Lightbulb, Plus } from '@lucide/vue'

import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n'
import { useDocumentStore } from '@/stores/document'
import { useFileStore } from '@/stores/file'

const docStore = useDocumentStore()
const fileStore = useFileStore()
const { t } = useI18n()

function addFirstTopic() {
  docStore.addChildTo(docStore.doc.root.id)
}
</script>

<template>
  <div
    class="pointer-events-none absolute top-5 left-1/2 z-10 w-[min(26rem,calc(100%-2rem))] -translate-x-1/2"
    data-empty-state
  >
    <div
      class="pointer-events-auto rounded-xl border border-border bg-card/95 p-4 text-card-foreground shadow-lg backdrop-blur"
    >
      <div class="flex items-start gap-3">
        <span
          class="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-500"
        >
          <Lightbulb class="size-4" />
        </span>
        <div class="min-w-0">
          <h2 class="text-sm font-semibold">{{ t('empty.title') }}</h2>
          <p class="mt-1 text-xs leading-relaxed text-muted-foreground">{{ t('empty.body') }}</p>
          <p class="mt-1.5 font-mono text-[10px] text-muted-foreground">
            {{ t('empty.shortcut') }}
          </p>
        </div>
      </div>

      <div class="mt-3 flex items-center gap-2">
        <Button size="sm" class="gap-1.5" data-empty-add @click="addFirstTopic">
          <Plus class="size-3.5" />
          {{ t('empty.add') }}
        </Button>
        <Button variant="ghost" size="sm" data-empty-example @click="fileStore.loadExample()">
          {{ t('empty.example') }}
        </Button>
      </div>
    </div>
  </div>
</template>
