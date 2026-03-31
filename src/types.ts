import type { Locale } from './i18n';

export interface CustomCalloutDef {
  id: string;
  aliases: string[];
  color: string;
  iconPath: string;
}

export interface PluginSettings {
  calloutTitles: Record<string, string>;
  language: 'auto' | Locale;
  usageCounts: Record<string, number>;
  columnCount: 2 | 3 | 4;
  cardStyle: 'minimal' | 'filled';
  calloutOrder: string[];
  customCallouts: CustomCalloutDef[];
  sortMode: 'custom' | 'alpha' | 'frequency';
}

export const DEFAULT_SETTINGS: PluginSettings = {
  calloutTitles: {},
  language: 'auto',
  usageCounts: {},
  columnCount: 3,
  cardStyle: 'minimal',
  calloutOrder: [],
  customCallouts: [],
  sortMode: 'custom',
};
