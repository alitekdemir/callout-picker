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
    // Context menu
    insertAs: 'Olarak ekle',
    // Fold toggle
    foldDefault: 'Varsayılan',
    foldOpen: 'Açık',
    foldClosed: 'Kapalı',
    // Preview
    previewLabel: 'Önizleme',
    previewContent: '...',
    // Wrapping indicator
    wrapping: 'Sarılıyor',
    // Replace mode
    replacingCallout: 'Değiştiriliyor',
    // Sort
    sortLabel: 'Sıralama',
    sortCustom: 'Özel sıra',
    sortAlpha: 'Alfabetik',
    sortFrequency: 'Sık kullanılan',
    // Multi-paragraph first-para as title
    firstParaAsTitle: 'İlk paragrafı başlık yap',
    // Settings
    settingsColumnCount: 'Kolon Sayısı',
    settingsColumnCountDesc: 'Popup ızgarasındaki sütun sayısını seçin.',
    settingsCardStyle: 'Kart Stili',
    settingsCardStyleDesc: 'Minimal (açık kenarlık) veya Dolgulu (renkli arka plan) görünüm.',
    settingsCardStyleMinimal: 'Minimal',
    settingsCardStyleFilled: 'Dolgulu',
    settingsOrder: 'Callout Sırası',
    settingsOrderDesc: 'Yukarı/aşağı oklarla popup\'taki sıralamayı değiştirin.',
    settingsCustomCallouts: 'Özel Callout\'lar',
    settingsCustomDesc: 'Kendi callout türlerinizi tanımlayın.',
    settingsAddCustom: 'Özel Callout Ekle',
    settingsCustomId: 'ID',
    settingsCustomColor: 'Renk',
    settingsCustomAliases: 'Diğer Adlar',
    settingsCustomAliasesPlaceholder: 'alias1, alias2',
    settingsCustomAdd: 'Ekle',
    settingsCustomRemove: 'Kaldır',
    settingsTitleTemplateHint: 'Şablonlar: {date} = bugünün tarihi, {time} = saat',
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
    // Context menu
    insertAs: 'Insert as',
    // Fold toggle
    foldDefault: 'Default',
    foldOpen: 'Open',
    foldClosed: 'Closed',
    // Preview
    previewLabel: 'Preview',
    previewContent: '...',
    // Wrapping indicator
    wrapping: 'Wrapping',
    // Replace mode
    replacingCallout: 'Replacing',
    // Sort
    sortLabel: 'Sort',
    sortCustom: 'Custom order',
    sortAlpha: 'Alphabetical',
    sortFrequency: 'Most used',
    // Multi-paragraph first-para as title
    firstParaAsTitle: 'Use first paragraph as title',
    // Settings
    settingsColumnCount: 'Column Count',
    settingsColumnCountDesc: 'Number of columns in the picker grid.',
    settingsCardStyle: 'Card Style',
    settingsCardStyleDesc: 'Minimal (outline border) or Filled (colored background).',
    settingsCardStyleMinimal: 'Minimal',
    settingsCardStyleFilled: 'Filled',
    settingsOrder: 'Callout Order',
    settingsOrderDesc: 'Use the up/down arrows to reorder callouts in the picker.',
    settingsCustomCallouts: 'Custom Callouts',
    settingsCustomDesc: 'Define your own callout types.',
    settingsAddCustom: 'Add Custom Callout',
    settingsCustomId: 'ID',
    settingsCustomColor: 'Color',
    settingsCustomAliases: 'Aliases',
    settingsCustomAliasesPlaceholder: 'alias1, alias2',
    settingsCustomAdd: 'Add',
    settingsCustomRemove: 'Remove',
    settingsTitleTemplateHint: 'Templates: {date} = today\'s date, {time} = current time',
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
