<script setup lang="ts">
import { Keyboard, Move, Save } from '@lucide/vue'
import { computed, onBeforeUnmount, onMounted } from 'vue'

import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n'
import { useFileStore } from '@/stores/file'
import { useUiStore } from '@/stores/ui'

const fileStore = useFileStore()
const uiStore = useUiStore()
const { t } = useI18n()

const visible = computed(
  () => uiStore.onboardingOpen && !fileStore.recoveryOpen && !fileStore.unsavedOpen,
)

const steps = [
  {
    icon: Keyboard,
    title: 'onboarding.stepCaptureTitle',
    body: 'onboarding.stepCaptureBody',
  },
  {
    icon: Move,
    title: 'onboarding.stepCanvasTitle',
    body: 'onboarding.stepCanvasBody',
  },
  {
    icon: Save,
    title: 'onboarding.stepFilesTitle',
    body: 'onboarding.stepFilesBody',
  },
] as const

function start() {
  uiStore.completeOnboarding()
}

function startBlank() {
  fileStore.newNow()
  uiStore.completeOnboarding()
}

function loadExample() {
  fileStore.loadExample()
  uiStore.completeOnboarding()
}

function onKeydown(event: KeyboardEvent) {
  if (!visible.value || event.key !== 'Escape') return

  event.preventDefault()
  event.stopPropagation()
  start()
}

onMounted(() => window.addEventListener('keydown', onKeydown, true))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown, true))
</script>

<template>
  <div
    v-if="visible"
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-6 backdrop-blur-[2px]"
    data-onboarding
    @pointerdown.self.stop="start"
    @wheel.stop
  >
    <div
      class="w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-2xl"
    >
      <div class="border-b border-border px-6 py-5">
        <p class="text-[10px] font-semibold tracking-[0.18em] text-sky-500 uppercase">Zmind</p>
        <h2 class="mt-1 text-lg font-semibold">{{ t('onboarding.title') }}</h2>
        <p class="mt-1 text-sm text-muted-foreground">{{ t('onboarding.subtitle') }}</p>
      </div>

      <div class="grid gap-3 p-6 sm:grid-cols-3">
        <section
          v-for="step in steps"
          :key="step.title"
          class="rounded-xl border border-border bg-background/60 p-3"
        >
          <component :is="step.icon" class="size-4 text-sky-500" />
          <h3 class="mt-2 text-xs font-semibold">{{ t(step.title) }}</h3>
          <p class="mt-1 text-[11px] leading-relaxed text-muted-foreground">{{ t(step.body) }}</p>
        </section>
      </div>

      <div
        class="flex flex-wrap items-center justify-between gap-3 border-t border-border px-6 py-4"
      >
        <p class="text-[11px] text-muted-foreground">{{ t('onboarding.hint') }}</p>
        <div class="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" data-onboarding-blank @click="startBlank">
            {{ t('onboarding.blank') }}
          </Button>
          <Button variant="outline" size="sm" data-onboarding-example @click="loadExample">
            {{ t('onboarding.example') }}
          </Button>
          <Button size="sm" data-onboarding-start @click="start">
            {{ t('onboarding.start') }}
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>
