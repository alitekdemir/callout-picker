export type Locale = 'tr' | 'en';

const translations = {
  tr: {
    commandName: 'Callout Seçici',
    contextMenuLabel: 'Callout Ekle',
    modalTitle: 'Callout Seç',
    settingsTitle: 'Callout Seçici Ayarları',
    settingsDesc: 'Her callout türü için varsayılan başlık belirleyin.',
    settingsTitleField: 'Varsayılan Başlık',
    settingsPlaceholder: 'Varsayılan başlık (isteğe bağlı)',
    settingsLanguageLabel: 'Dil',
    settingsLanguageDesc: 'Eklenti arayüz dilini seçin.',
    langAuto: 'Otomatik (Obsidian dili)',
    langTr: 'Türkçe',
    langEn: 'İngilizce',
    aliasesLabel: 'Diğer adlar',
  },
  en: {
    commandName: 'Callout Picker',
    contextMenuLabel: 'Insert Callout',
    modalTitle: 'Pick a Callout',
    settingsTitle: 'Callout Picker Settings',
    settingsDesc: 'Set a default title for each callout type.',
    settingsTitleField: 'Default Title',
    settingsPlaceholder: 'Default title (optional)',
    settingsLanguageLabel: 'Language',
    settingsLanguageDesc: 'Choose the plugin interface language.',
    langAuto: 'Auto (follow Obsidian)',
    langTr: 'Turkish',
    langEn: 'English',
    aliasesLabel: 'Aliases',
  },
} as const;

export type Strings = typeof translations['en'];

export function detectLocale(): Locale {
  const lang: string =
    (window as any).moment?.locale?.() ?? navigator.language ?? 'en';
  return lang.startsWith('tr') ? 'tr' : 'en';
}

export function t(locale: Locale): Strings {
  return translations[locale] ?? translations['en'];
}
