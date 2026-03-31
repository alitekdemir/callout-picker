import { Plugin } from 'obsidian';
import { DEFAULT_SETTINGS, type PluginSettings } from './types';
import { detectLocale, t } from './i18n';
import { CalloutPickerModal } from './CalloutPickerModal';
import { CalloutPickerSettingsTab } from './SettingsTab';

export default class CalloutPickerPlugin extends Plugin {
  settings: PluginSettings = DEFAULT_SETTINGS;

  async onload() {
    await this.loadSettings();

    const locale =
      this.settings.language === 'auto' ? detectLocale() : this.settings.language;
    const strings = t(locale);

    this.addCommand({
      id: 'open-callout-picker',
      name: strings.commandName,
      editorCallback: (editor) => {
        new CalloutPickerModal(this.app, editor, this.settings, () => this.saveSettings()).open();
      },
    });

    this.registerEvent(
      this.app.workspace.on('editor-menu', (menu, editor) => {
        menu.addItem((item) => {
          item
            .setTitle(strings.contextMenuLabel)
            .setIcon('quote-glyph')
            .setSection('callout-picker')
            .onClick(() => new CalloutPickerModal(this.app, editor, this.settings, () => this.saveSettings()).open());
        });
      }),
    );

    this.addSettingTab(new CalloutPickerSettingsTab(this.app, this));
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
