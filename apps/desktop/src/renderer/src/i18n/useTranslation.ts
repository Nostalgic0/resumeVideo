import { useStore } from '../store/useStore'
import { translations } from './translations'

export function useTranslation() {
  const appLanguage = useStore((s) => s.settings.appLanguage)
  const dict = translations[appLanguage] || translations['en']

  function t(key: string, replacements?: Record<string, string | number>): string {
    let text = dict[key]
    if (text === undefined) {
      const fallback = translations['en'][key]
      text = fallback !== undefined ? fallback : key
    }
    if (replacements) {
      for (const [k, v] of Object.entries(replacements)) {
        text = text.replace(`{${k}}`, String(v))
      }
    }
    return text
  }

  return { t, lang: appLanguage }
}
