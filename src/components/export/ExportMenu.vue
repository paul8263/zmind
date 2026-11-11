<script setup lang="ts">
import { Download, FileCode2, FileText, Image as ImageIcon, Printer, X } from '@lucide/vue'
import { ref } from 'vue'

import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n'
import { useExportStore } from '@/stores/export'

const exportStore = useExportStore()
const { t } = useI18n()

const open = ref(false)

function run(action: () => void | Promise<void>) {
  open.value = false
  void action()
}
</script>

<template>
  <div class="relative">
    <Button
      variant="ghost"
      size="icon-sm"
      :class="{ 'bg-accent text-accent-foreground': open }"
      :title="t('export.title')"
      :aria-label="t('export.title')"
      data-export-toggle
      @click="open = !open"
    >
      <Download />
    </Button>

    <div v-if="open" class="fixed inset-0 z-20" @pointerdown="open = false"></div>

    <div
      v-if="open"
      class="absolute top-full right-0 z-30 mt-1 w-60 overflow-hidden rounded-lg border border-border bg-card p-1 text-card-foreground shadow-xl"
      data-export-menu
    >
      <div
        class="px-2 py-1 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase"
      >
        {{ t('export.png') }}
      </div>
      <button
        v-for="scale in [1, 2, 3] as const"
        :key="scale"
        type="button"
        class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-accent"
        :data-export-png="scale"
        @click="run(() => exportStore.exportPng(scale))"
      >
        <ImageIcon class="size-3.5 text-muted-foreground" />
        <span>{{ t(`export.png${scale}x`) }}</span>
      </button>

      <div class="my-1 h-px bg-border"></div>

      <button
        type="button"
        class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-accent"
        data-export-svg
        @click="run(() => exportStore.exportSvg())"
      >
        <FileCode2 class="size-3.5 text-muted-foreground" />
        <span>{{ t('export.svg') }}</span>
      </button>
      <button
        type="button"
        class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-accent"
        data-export-markdown
        @click="run(() => exportStore.exportMarkdown())"
      >
        <FileText class="size-3.5 text-muted-foreground" />
        <span>{{ t('export.markdown') }}</span>
      </button>
      <button
        type="button"
        class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-accent"
        data-export-pdf
        @click="run(() => exportStore.exportPdf())"
      >
        <Printer class="size-3.5 text-muted-foreground" />
        <span>{{ t('export.pdf') }}</span>
      </button>
    </div>

    <Teleport to="body">
      <div
        v-if="exportStore.exporting"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-6 backdrop-blur-[2px]"
        data-export-progress
        @pointerdown.stop
        @wheel.stop
      >
        <div
          class="w-full max-w-sm rounded-xl border border-border bg-card p-5 text-card-foreground shadow-2xl"
        >
          <h2 class="text-sm font-semibold">{{ t('export.progressTitle') }}</h2>
          <p class="mt-2 text-xs text-muted-foreground">
            {{ t(exportStore.progressKey) }}
          </p>
          <div class="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              class="h-full rounded-full bg-sky-500 transition-all duration-200"
              :style="{ width: `${exportStore.progress}%` }"
            ></div>
          </div>
          <p class="mt-2 text-right text-[11px] text-muted-foreground tabular-nums">
            {{ exportStore.progress }}%
          </p>
        </div>
      </div>

      <div
        v-if="exportStore.hasError"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-6 backdrop-blur-[2px]"
        data-export-error
        @pointerdown.stop
        @wheel.stop
      >
        <div
          class="w-full max-w-md rounded-xl border border-border bg-card p-5 text-card-foreground shadow-2xl"
        >
          <h2 class="text-sm font-semibold">{{ t('export.errorTitle') }}</h2>
          <p class="mt-2 text-xs leading-relaxed text-foreground/80">
            {{ exportStore.errorKey ? t(exportStore.errorKey) : '' }}
          </p>
          <p
            v-if="exportStore.errorDetail"
            class="mt-2 max-h-32 overflow-auto rounded-md bg-muted px-2 py-1.5 font-mono text-[11px] break-all text-muted-foreground"
          >
            {{ t('file.details') }}: {{ exportStore.errorDetail }}
          </p>
          <div class="mt-5 flex justify-end">
            <Button size="sm" data-close-export-error @click="exportStore.clearError()">
              {{ t('export.close') }}
            </Button>
          </div>
        </div>
      </div>

      <div
        v-if="exportStore.hasNotice"
        class="fixed bottom-4 left-1/2 z-50 flex max-w-md -translate-x-1/2 items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs text-card-foreground shadow-lg"
        data-export-notice
      >
        <span class="min-w-0 break-all">
          {{
            exportStore.noticeKey
              ? t(exportStore.noticeKey, {
                  path: exportStore.noticeDetail,
                  name: exportStore.noticeDetail,
                })
              : ''
          }}
        </span>
        <button
          type="button"
          class="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
          :aria-label="t('export.close')"
          @click="exportStore.clearNotice()"
        >
          <X class="size-3" />
        </button>
      </div>
    </Teleport>
  </div>
</template>
