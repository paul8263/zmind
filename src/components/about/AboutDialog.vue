<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'

import { version } from '../../../package.json'
import appIcon from '@/assets/zmind-icon.png'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n'
import { useUiStore } from '@/stores/ui'

const uiStore = useUiStore()
const { t } = useI18n()

function onKeydown(event: KeyboardEvent) {
  if (!uiStore.aboutOpen || event.key !== 'Escape') return

  event.preventDefault()
  event.stopPropagation()
  uiStore.closeAbout()
}

onMounted(() => window.addEventListener('keydown', onKeydown, true))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown, true))
</script>

<template>
  <div
    v-if="uiStore.aboutOpen"
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-6 backdrop-blur-[2px]"
    data-about-dialog
    @pointerdown.self="uiStore.closeAbout()"
    @wheel.stop
  >
    <div
      class="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center text-card-foreground shadow-2xl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-dialog-title"
    >
      <img
        :src="appIcon"
        alt="Zmind"
        class="mx-auto size-16 rounded-xl shadow-sm"
        data-about-icon
      />
      <h2 id="about-dialog-title" class="mt-4 text-lg font-semibold">Zmind</h2>
      <p class="mt-1 text-xs text-muted-foreground">
        {{ t('about.version', { version }) }}
      </p>

      <dl class="mt-5 space-y-2 text-left text-xs" data-about-author>
        <div class="flex items-start justify-between gap-4">
          <dt class="shrink-0 text-muted-foreground">{{ t('about.author') }}</dt>
          <dd class="text-right">Yao Zhang</dd>
        </div>
        <div class="flex items-start justify-between gap-4">
          <dt class="shrink-0 text-muted-foreground">{{ t('about.email') }}</dt>
          <dd class="text-right font-mono">xzhangyao@126.com</dd>
        </div>
      </dl>

      <p class="mt-5 text-[11px] text-muted-foreground" data-about-copyright>
        {{ t('about.copyright') }}
      </p>

      <Button class="mt-5 w-full" size="sm" data-about-close @click="uiStore.closeAbout()">
        {{ t('app.close') }}
      </Button>
    </div>
  </div>
</template>
