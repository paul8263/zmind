<script setup lang="ts">
import { AlertTriangle, Copy, RotateCw, X } from '@lucide/vue'
import { computed, ref } from 'vue'

import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n'
import { useDiagnosticsStore } from '@/stores/diagnostics'

const diagnostics = useDiagnosticsStore()
const { t } = useI18n()
const copied = ref(false)

const detail = computed(() => {
  const error = diagnostics.lastError
  if (!error) return ''
  return error.stack || error.message
})

async function copyLog() {
  try {
    await navigator.clipboard.writeText(diagnostics.logText)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 1500)
  } catch {
    copied.value = false
  }
}

function reload() {
  window.location.reload()
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="diagnostics.lastError"
      class="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 p-6 backdrop-blur-[2px]"
      data-app-error
      @pointerdown.stop
      @wheel.stop
    >
      <div
        class="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-2xl"
      >
        <div class="flex items-start gap-3 border-b border-border px-5 py-4">
          <span
            class="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-500"
          >
            <AlertTriangle class="size-4" />
          </span>
          <div class="min-w-0">
            <h2 class="text-sm font-semibold">{{ t('diagnostics.title') }}</h2>
            <p class="mt-1 text-xs leading-relaxed text-muted-foreground">
              {{ t('diagnostics.body') }}
            </p>
          </div>
          <button
            type="button"
            class="ml-auto flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
            :aria-label="t('diagnostics.dismiss')"
            data-dismiss-app-error
            @click="diagnostics.dismiss()"
          >
            <X class="size-3.5" />
          </button>
        </div>

        <div class="space-y-2 px-5 py-4">
          <p class="text-[11px] text-muted-foreground">
            {{ t('diagnostics.source') }}:
            <span class="font-mono text-foreground/80">{{ diagnostics.lastError.source }}</span>
          </p>
          <p class="rounded-md bg-muted px-2.5 py-2 font-mono text-[11px] break-words">
            {{ diagnostics.lastError.message }}
          </p>
          <pre
            v-if="detail"
            class="max-h-40 overflow-auto rounded-md bg-muted px-2.5 py-2 font-mono text-[10px] leading-relaxed break-words whitespace-pre-wrap text-muted-foreground"
            data-app-error-detail
            >{{ detail }}</pre>
          <p class="text-[11px] text-muted-foreground">
            {{ t('diagnostics.logCount', { count: diagnostics.entries.length }) }}
          </p>
        </div>

        <div class="flex flex-wrap items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Button variant="ghost" size="sm" class="gap-1.5" data-copy-app-log @click="copyLog()">
            <Copy class="size-3.5" />
            {{ copied ? t('diagnostics.copied') : t('diagnostics.copy') }}
          </Button>
          <Button variant="outline" size="sm" class="gap-1.5" data-reload-app @click="reload()">
            <RotateCw class="size-3.5" />
            {{ t('diagnostics.reload') }}
          </Button>
          <Button size="sm" data-dismiss-app-error @click="diagnostics.dismiss()">
            {{ t('diagnostics.dismiss') }}
          </Button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
