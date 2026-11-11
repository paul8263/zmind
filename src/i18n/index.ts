import { computed } from 'vue'

import { useUiStore } from '@/stores/ui'

import { messages, type Locale, type MessageKey } from './messages'

export function translate(
  locale: Locale,
  key: MessageKey | string,
  params?: Record<string, string | number>,
): string {
  const table = messages[locale] as Record<string, string>
  const fallback = messages.zh as Record<string, string>
  let value = table[key] ?? fallback[key] ?? key

  if (params) {
    for (const [name, replacement] of Object.entries(params)) {
      value = value.split(`{${name}}`).join(String(replacement))
    }
  }

  return value
}

export function useI18n() {
  const uiStore = useUiStore()
  const locale = computed(() => uiStore.locale)

  function t(key: MessageKey | string, params?: Record<string, string | number>): string {
    return translate(uiStore.locale, key, params)
  }

  return { t, locale }
}
