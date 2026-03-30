import { App, PluginSettingTab, Setting } from 'obsidian';
import { CALLOUTS } from './calloutData';
import { detectLocale, t, type Locale } from './i18n';
import type CalloutPickerPlugin from './main';

export class CalloutPickerSettingsTab extends PluginSettingTab {
  constructor(app: App, private plugin: CalloutPickerPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    const locale: Locale =
      this.plugin.settings.language === 'auto' ? detectLocale() : this.plugin.settings.language;
    const strings = t(locale);

    containerEl.createEl('h2', { text: strings.settingsTitle });
    containerEl.createEl('p', { text: strings.settingsDesc, cls: 'setting-item-description' });

    new Setting(containerEl)
      .setName(strings.settingsLanguageLabel)
      .setDesc(strings.settingsLanguageDesc)
      .addDropdown((dropdown) => {
        dropdown
          .addOption('auto', strings.langAuto)
          .addOption('tr', strings.langTr)
          .addOption('en', strings.langEn)
          .setValue(this.plugin.settings.language)
          .onChange(async (value) => {
            this.plugin.settings.language = value as 'auto' | Locale;
            await this.plugin.saveSettings();
            this.display();
          });
      });

    containerEl.createEl('hr');

    for (const callout of CALLOUTS) {
      const aliases = callout.aliases.length
        ? `  —  ${strings.aliasesLabel}: ${callout.aliases.join(', ')}`
        : '';

      new Setting(containerEl)
        .setName(callout.id.charAt(0).toUpperCase() + callout.id.slice(1))
        .setDesc(`[!${callout.id}]${aliases}`)
        .addText((text) => {
          text
            .setPlaceholder(strings.settingsPlaceholder)
            .setValue(this.plugin.settings.calloutTitles[callout.id] ?? '')
            .onChange(async (value) => {
              if (value.trim()) {
                this.plugin.settings.calloutTitles[callout.id] = value.trim();
              } else {
                delete this.plugin.settings.calloutTitles[callout.id];
              }
              await this.plugin.saveSettings();
            });
        });
    }
  }
}
