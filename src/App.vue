<script setup lang="ts">
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import { getCurrentWindow } from '@tauri-apps/api/window'
import {
  BookOpen,
  FileInput,
  FilePlus2,
  FolderOpen,
  History,
  Languages,
  List,
  Moon,
  Redo2,
  Save,
  SlidersHorizontal,
  Sun,
  Undo2,
  X,
} from '@lucide/vue'
import { computed, onBeforeUnmount, onMounted, ref, watch, watchEffect } from 'vue'

import MindMapCanvas from '@/components/canvas/MindMapCanvas.vue'
import ExportMenu from '@/components/export/ExportMenu.vue'
import FileDialogs from '@/components/file/FileDialogs.vue'
import InspectorPanel from '@/components/inspector/InspectorPanel.vue'
import OnboardingDialog from '@/components/onboarding/OnboardingDialog.vue'
import OutlinePanel from '@/components/outline/OutlinePanel.vue'
import AppErrorOverlay from '@/components/system/AppErrorOverlay.vue'
import { Button } from '@/components/ui/button'
import type { Structure } from '@/domain/model/types'
import { useI18n } from '@/i18n'
import { isDesktop, setMenuLocale } from '@/lib/fileBridge'
import { useDocumentStore } from '@/stores/document'
import { useExportStore } from '@/stores/export'
import { useFileStore } from '@/stores/file'
import { useUiStore } from '@/stores/ui'

const docStore = useDocumentStore()
const exportStore = useExportStore()
const fileStore = useFileStore()
const uiStore = useUiStore()
const { t } = useI18n()

const recentOpen = ref(false)

const structures = computed<{ value: Structure; label: string }[]>(() => [
  { value: 'logic-right', label: t('structure.logicRight') },
  { value: 'logic-left', label: t('structure.logicLeft') },
  { value: 'logic-both', label: t('structure.logicBoth') },
  { value: 'org-down', label: t('structure.orgDown') },
])

let unlistenMenu: UnlistenFn | undefined
let unlistenOpenFile: UnlistenFn | undefined
let unlistenClose: UnlistenFn | undefined

fileStore.startTracking()

watchEffect(() => {
  document.documentElement.classList.toggle('dark', uiStore.darkMode)
  document.documentElement.lang = uiStore.locale === 'en' ? 'en' : 'zh-CN'

  const title = `${fileStore.displayName}${fileStore.isDirty ? ' •' : ''} — Zmind`
  document.title = title
  if (isDesktop())
    void getCurrentWindow()
      .setTitle(title)
      .catch(() => undefined)
})

watch(
  () => uiStore.locale,
  (locale) => {
    if (isDesktop()) void setMenuLocale(locale).catch(() => undefined)
  },
)

watch(
  () => fileStore.exitRequested,
  async (requested) => {
    if (!requested) return
    if (!isDesktop()) {
      fileStore.resetExitRequest()
      return
    }
    try {
      await getCurrentWindow().destroy()
    } catch {
      fileStore.resetExitRequest()
    }
  },
)

function onStructureChange(event: Event) {
  docStore.setStructure((event.target as HTMLSelectElement).value as Structure)
}

function focusCanvas() {
  requestAnimationFrame(() => {
    document.querySelector<HTMLElement>('[data-mindmap-canvas]')?.focus({ preventScroll: true })
  })
}

function undo() {
  docStore.undo()
  focusCanvas()
}

function redo() {
  docStore.redo()
  focusCanvas()
}

function handleMenuAction(action: string) {
  switch (action) {
    case 'new':
      fileStore.requestNew()
      break
    case 'open':
      fileStore.requestOpenDialog()
      break
    case 'save':
      void fileStore.save()
      break
    case 'save-as':
      void fileStore.saveAs()
      break
    case 'exit':
      fileStore.requestExit()
      break
    case 'undo':
      undo()
      break
    case 'redo':
      redo()
      break
  }
}

function onWindowKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape' && recentOpen.value) {
    recentOpen.value = false
    return
  }

  if (isDesktop() || !(event.ctrlKey || event.metaKey)) return
  const key = event.key.toLowerCase()

  if (key === 'n') {
    event.preventDefault()
    fileStore.requestNew()
  } else if (key === 'o') {
    event.preventDefault()
    fileStore.requestOpenDialog()
  } else if (key === 's') {
    event.preventDefault()
    if (event.shiftKey) void fileStore.saveAs()
    else void fileStore.save()
  }
}

function toggleRecent() {
  recentOpen.value = !recentOpen.value
}

function openRecent(path: string) {
  recentOpen.value = false
  fileStore.requestOpenPath(path)
}

function removeRecent(path: string) {
  fileStore.removeRecent(path)
}

function saveAsFromMenu() {
  recentOpen.value = false
  void fileStore.saveAs()
}

function clearRecent() {
  fileStore.clearRecent()
}

onMounted(async () => {
  window.addEventListener('keydown', onWindowKeyDown)

  if (isDesktop()) {
    unlistenMenu = await listen<string>('menu-action', (event) =>
      handleMenuAction(event.payload),
    ).catch(() => undefined)
    unlistenOpenFile = await listen<string>('open-file', (event) =>
      fileStore.requestOpenPath(event.payload),
    ).catch(() => undefined)
    unlistenClose = await getCurrentWindow()
      .onCloseRequested((event) => {
        if (!fileStore.isDirty) return
        event.preventDefault()
        fileStore.requestExit()
      })
      .catch(() => undefined)
    await setMenuLocale(uiStore.locale).catch(() => undefined)
  }

  await fileStore.initialize()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onWindowKeyDown)
  unlistenMenu?.()
  unlistenOpenFile?.()
  unlistenClose?.()
  fileStore.stopTracking()
})
</script>

<template>
  <div class="flex h-full flex-col bg-background text-foreground">
    <header
      class="flex h-11 shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-4 text-card-foreground"
    >
      <div class="flex min-w-0 items-center gap-2">
        <span class="text-sm font-semibold tracking-tight">Zmind</span>
        <span class="h-4 w-px shrink-0 bg-border"></span>
        <div class="flex min-w-0 items-center gap-1.5">
          <span
            class="truncate text-xs font-medium"
            :title="fileStore.path ?? fileStore.displayName"
          >
            {{ fileStore.displayName }}
          </span>
          <span
            v-if="fileStore.isDirty"
            class="size-1.5 shrink-0 rounded-full bg-amber-500"
            :title="t('file.unsaved')"
            data-dirty-indicator
          ></span>
          <span class="hidden shrink-0 text-[10px] text-muted-foreground sm:inline">
            {{ fileStore.isDirty ? t('file.unsaved') : t('file.saved') }}
          </span>
        </div>
      </div>

      <div class="flex shrink-0 items-center gap-2">
        <div class="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon-sm"
            :title="t('file.new')"
            :aria-label="t('file.new')"
            data-file-new
            @click="fileStore.requestNew()"
          >
            <FilePlus2 />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            :title="t('file.open')"
            :aria-label="t('file.open')"
            data-file-open
            @click="fileStore.requestOpenDialog()"
          >
            <FolderOpen />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            :title="t('file.save')"
            :aria-label="t('file.save')"
            data-file-save
            @click="fileStore.save()"
          >
            <Save />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            :title="t('import.title')"
            :aria-label="t('import.title')"
            :disabled="exportStore.exporting"
            data-import
            @click="exportStore.importDocument()"
          >
            <FileInput />
          </Button>
          <ExportMenu />
          <div class="relative">
            <Button
              variant="ghost"
              size="icon-sm"
              :class="{ 'bg-accent text-accent-foreground': recentOpen }"
              :title="t('file.recent')"
              :aria-label="t('file.recent')"
              data-recent-toggle
              @click="toggleRecent()"
            >
              <History />
            </Button>

            <div
              v-if="recentOpen"
              class="fixed inset-0 z-20"
              @pointerdown="recentOpen = false"
            ></div>

            <div
              v-if="recentOpen"
              class="absolute top-full right-0 z-30 mt-1 w-80 overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-xl"
              data-recent-menu
            >
              <div class="border-b border-border p-1">
                <button
                  type="button"
                  class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-accent"
                  data-recent-save-as
                  @click="saveAsFromMenu()"
                >
                  <Save class="size-3.5 text-muted-foreground" />
                  <span>{{ t('file.saveAs') }}</span>
                  <span class="ml-auto font-mono text-[10px] text-muted-foreground">
                    Ctrl+Shift+S
                  </span>
                </button>
              </div>

              <div class="max-h-72 overflow-auto p-1">
                <p
                  v-if="fileStore.recentFiles.length === 0"
                  class="px-2 py-3 text-center text-xs text-muted-foreground"
                >
                  {{ t('file.noRecent') }}
                </p>

                <div
                  v-for="recent in fileStore.recentFiles"
                  :key="recent.path"
                  class="group flex items-center gap-1 rounded-md hover:bg-accent"
                >
                  <button
                    type="button"
                    class="min-w-0 flex-1 px-2 py-1.5 text-left"
                    :title="recent.path"
                    @click="openRecent(recent.path)"
                  >
                    <span class="block truncate text-xs">{{ recent.name }}</span>
                    <span class="block truncate text-[10px] text-muted-foreground">
                      {{ recent.path }}
                    </span>
                  </button>
                  <button
                    type="button"
                    class="mr-1 flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-background hover:text-red-500"
                    :title="t('file.removeRecent')"
                    :aria-label="t('file.removeRecent')"
                    @click.stop="removeRecent(recent.path)"
                  >
                    <X class="size-3" />
                  </button>
                </div>
              </div>

              <div v-if="fileStore.recentFiles.length > 0" class="border-t border-border p-1">
                <button
                  type="button"
                  class="w-full rounded-md px-2 py-1.5 text-left text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  @click="clearRecent()"
                >
                  {{ t('file.clearRecent') }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-0.5 border-l border-border pl-2">
          <Button
            variant="ghost"
            size="icon-sm"
            :title="t('app.undoTitle')"
            :aria-label="t('app.undo')"
            :disabled="!docStore.canUndo"
            @click="undo()"
          >
            <Undo2 />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            :title="t('app.redoTitle')"
            :aria-label="t('app.redo')"
            :disabled="!docStore.canRedo"
            @click="redo()"
          >
            <Redo2 />
          </Button>
        </div>

        <select
          class="h-7 cursor-pointer rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none hover:bg-accent focus:ring-2 focus:ring-sky-200 dark:focus:ring-sky-800"
          :aria-label="t('app.structure')"
          :value="docStore.doc.structure"
          @change="onStructureChange"
        >
          <option v-for="item in structures" :key="item.value" :value="item.value">
            {{ item.label }}
          </option>
        </select>

        <span
          v-if="docStore.selectedNode"
          class="hidden max-w-40 truncate text-xs text-muted-foreground xl:inline"
        >
          {{ docStore.selectedNode.title || t('topic.untitled') }}
        </span>

        <div class="flex items-center gap-0.5 border-l border-border pl-2">
          <Button
            variant="ghost"
            size="icon-sm"
            :class="{ 'bg-accent text-accent-foreground': uiStore.outlineOpen }"
            :title="t('app.outline')"
            :aria-label="t('app.outline')"
            data-toggle-outline
            @click="uiStore.toggleOutline()"
          >
            <List />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            :class="{ 'bg-accent text-accent-foreground': uiStore.inspectorOpen }"
            :title="t('app.inspector')"
            :aria-label="t('app.inspector')"
            data-toggle-inspector
            @click="uiStore.toggleInspector()"
          >
            <SlidersHorizontal />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            :title="uiStore.darkMode ? t('app.lightMode') : t('app.darkMode')"
            :aria-label="uiStore.darkMode ? t('app.lightMode') : t('app.darkMode')"
            data-toggle-dark
            @click="uiStore.toggleDark()"
          >
            <Sun v-if="uiStore.darkMode" />
            <Moon v-else />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            class="gap-1 px-2 text-xs"
            :title="t('app.language')"
            :aria-label="t('app.language')"
            data-toggle-locale
            @click="uiStore.toggleLocale()"
          >
            <Languages class="size-3.5" />
            {{ uiStore.locale === 'zh' ? 'EN' : '中' }}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            :title="t('app.guide')"
            :aria-label="t('app.guide')"
            data-open-onboarding
            @click="uiStore.openOnboarding()"
          >
            <BookOpen />
          </Button>
        </div>

        <span class="hidden text-xs text-muted-foreground 2xl:inline">{{ t('app.badge') }}</span>
      </div>
    </header>

    <main class="flex min-h-0 flex-1">
      <OutlinePanel v-if="uiStore.outlineOpen" />

      <div class="relative min-w-0 flex-1">
        <MindMapCanvas />
      </div>

      <InspectorPanel v-if="uiStore.inspectorOpen" />
    </main>

    <FileDialogs />
    <OnboardingDialog />
    <AppErrorOverlay />
  </div>
</template>
