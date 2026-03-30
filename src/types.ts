import type { Locale } from './i18n';

export interface PluginSettings {
  calloutTitles: Record<string, string>;
  language: 'auto' | Locale;
}

export const DEFAULT_SETTINGS: PluginSettings = {
  calloutTitles: {},
  language: 'auto',
};
