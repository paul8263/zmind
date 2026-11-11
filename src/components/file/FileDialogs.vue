<script setup lang="ts">
import { computed } from 'vue'

import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n'
import { useFileStore } from '@/stores/file'

const fileStore = useFileStore()
const { t } = useI18n()

const errorMessage = computed(() =>
  fileStore.errorKey ? t(fileStore.errorKey) : t('file.errorTitle'),
)
</script>

<template>
  <Teleport to="body">
    <div
      v-if="fileStore.unsavedOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-6 backdrop-blur-[2px]"
      data-unsaved-dialog
      @pointerdown.stop
      @wheel.stop
    >
      <div
        class="w-full max-w-md rounded-xl border border-border bg-card p-5 text-card-foreground shadow-2xl"
      >
        <h2 class="text-sm font-semibold">{{ t('file.unsavedTitle') }}</h2>
        <p class="mt-2 text-xs leading-relaxed text-muted-foreground">
          {{ t('file.unsavedMessage', { name: fileStore.pendingName }) }}
        </p>

        <div class="mt-5 flex flex-wrap justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            :disabled="fileStore.busy"
            @click="fileStore.cancelPending()"
          >
            {{ t('file.cancel') }}
          </Button>
          <Button
            variant="outline"
            size="sm"
            class="text-red-600 hover:text-red-700 dark:text-red-400"
            :disabled="fileStore.busy"
            data-discard-changes
            @click="fileStore.discardAndContinue()"
          >
            {{ t('file.discard') }}
          </Button>
          <Button
            size="sm"
            :disabled="fileStore.busy"
            data-save-changes
            @click="fileStore.saveAndContinue()"
          >
            {{ t('file.saveAndContinue') }}
          </Button>
        </div>
      </div>
    </div>

    <div
      v-if="fileStore.recoveryOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-6 backdrop-blur-[2px]"
      data-recovery-dialog
      @pointerdown.stop
      @wheel.stop
    >
      <div
        class="w-full max-w-md rounded-xl border border-border bg-card p-5 text-card-foreground shadow-2xl"
      >
        <h2 class="text-sm font-semibold">{{ t('file.recoveryTitle') }}</h2>
        <p class="mt-2 text-xs leading-relaxed text-muted-foreground">
          {{
            t('file.recoveryMessage', {
              name: fileStore.recoveryName,
              time: fileStore.recoveryTime,
            })
          }}
        </p>

        <div class="mt-5 flex justify-end gap-2">
          <Button variant="ghost" size="sm" @click="fileStore.discardRecovery()">
            {{ t('file.recoveryDiscard') }}
          </Button>
          <Button size="sm" data-restore-recovery @click="fileStore.restoreRecovery()">
            {{ t('file.recoveryRestore') }}
          </Button>
        </div>
      </div>
    </div>

    <div
      v-if="fileStore.hasError"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-6 backdrop-blur-[2px]"
      data-file-error
      @pointerdown.stop
      @wheel.stop
    >
      <div
        class="w-full max-w-md rounded-xl border border-border bg-card p-5 text-card-foreground shadow-2xl"
      >
        <h2 class="text-sm font-semibold">{{ t('file.errorTitle') }}</h2>
        <p class="mt-2 text-xs leading-relaxed text-foreground/80">{{ errorMessage }}</p>
        <p
          v-if="fileStore.errorDetail"
          class="mt-2 max-h-32 overflow-auto rounded-md bg-muted px-2 py-1.5 font-mono text-[11px] break-all text-muted-foreground"
        >
          {{ t('file.details') }}: {{ fileStore.errorDetail }}
        </p>

        <div class="mt-5 flex justify-end">
          <Button size="sm" data-close-file-error @click="fileStore.clearError()">
            {{ t('file.close') }}
          </Button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
